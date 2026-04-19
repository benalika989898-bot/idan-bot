import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { toast } from 'sonner-native';

const ROW_HEIGHT = 80;
const ROW_GAP = 12;
const ITEM_SPACING = ROW_HEIGHT + ROW_GAP;
const SPRING_CONFIG = { damping: 18, stiffness: 180, mass: 0.35 };

type AppointmentTypeItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price?: number | null;
  is_active: boolean;
  user_id: string;
  display_order?: number | null;
};

const sortAppointmentTypes = (items: AppointmentTypeItem[]) => {
  return [...items].sort((a, b) => {
    const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.POSITIVE_INFINITY;
    const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aName = a.name || '';
    const bName = b.name || '';
    return aName.localeCompare(bName, 'he');
  });
};

const buildPositionsMap = (items: AppointmentTypeItem[]) => {
  const positions: Record<string, number> = {};
  items.forEach((item, index) => {
    positions[item.id] = index;
  });
  return positions;
};

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(value, max));
};

const AppointmentTypeOrderRow = ({
  appointmentType,
  index,
  totalCount,
  positions,
  activeId,
  listTop,
  onDragStateChange,
  onDragEnd,
  crewMemberName,
}: {
  appointmentType: AppointmentTypeItem;
  index: number;
  totalCount: number;
  positions: Animated.SharedValue<Record<string, number>>;
  activeId: Animated.SharedValue<string | null>;
  listTop: Animated.SharedValue<number>;
  onDragStateChange: (id: string | null) => void;
  onDragEnd: (positionsMap: Record<string, number>) => void;
  crewMemberName?: string;
}) => {
  const translateY = useSharedValue(0);
  const touchOffset = useSharedValue(0);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          activeId.value = appointmentType.id;
          runOnJS(onDragStateChange)(appointmentType.id);
          const position = positions.value[appointmentType.id] ?? index;
          const currentTranslate = position * ITEM_SPACING;
          translateY.value = currentTranslate;
          touchOffset.value = event.absoluteY - listTop.value - currentTranslate;
        })
        .onUpdate((event) => {
          const maxY = (totalCount - 1) * ITEM_SPACING;
          const relativeY = event.absoluteY - listTop.value - touchOffset.value;
          const nextTranslate = clamp(relativeY, 0, maxY);
          translateY.value = nextTranslate;

          const nextIndex = Math.round(nextTranslate / ITEM_SPACING);
          const currentIndex = positions.value[appointmentType.id] ?? index;
          if (nextIndex !== currentIndex) {
            const nextPositions = { ...positions.value };
            let swapId: string | null = null;
            for (const key in nextPositions) {
              if (nextPositions[key] === nextIndex) {
                swapId = key;
                break;
              }
            }
            if (swapId) {
              nextPositions[swapId] = currentIndex;
            }
            nextPositions[appointmentType.id] = nextIndex;
            positions.value = nextPositions;
          }
        })
        .onEnd(() => {
          const finalIndex = positions.value[appointmentType.id] ?? index;
          translateY.value = withSpring(finalIndex * ITEM_SPACING, SPRING_CONFIG);
          activeId.value = null;
          runOnJS(onDragStateChange)(null);
          runOnJS(onDragEnd)(positions.value);
        }),
    [
      activeId,
      appointmentType.id,
      index,
      listTop,
      onDragEnd,
      onDragStateChange,
      positions,
      totalCount,
      translateY,
    ]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const position = positions.value[appointmentType.id] ?? index;
    const baseY = withSpring(position * ITEM_SPACING, SPRING_CONFIG);
    const isActive = activeId.value === appointmentType.id;
    return {
      transform: [
        { translateY: isActive ? translateY.value : baseY },
        { scale: isActive ? 0.98 : 1 },
      ],
      zIndex: isActive ? 10 : 0,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ height: ROW_HEIGHT, position: 'absolute', left: 0, right: 0 }, animatedStyle]}
        className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4">
        <View className="flex-1">
          <Text className="text-left text-base font-semibold text-slate-900">
            {appointmentType.name || 'ללא שם'}
          </Text>
          <View className="mt-1 flex-row flex-wrap gap-x-3">
            <Text className="text-xs text-slate-500">{appointmentType.duration_minutes} דק׳</Text>
            {appointmentType.price ? (
              <Text className="text-xs text-slate-500">₪{appointmentType.price}</Text>
            ) : null}
            {!appointmentType.is_active ? (
              <Text className="text-xs text-red-500">לא פעיל</Text>
            ) : null}
          </View>
          {crewMemberName ? (
            <Text className="mt-1 text-xs text-slate-400">איש צוות: {crewMemberName}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-400">גרור</Text>
          <Ionicons name="reorder-three" size={20} color="#94a3b8" />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export default function AppointmentTypesOrderScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [orderedTypes, setOrderedTypes] = useState<AppointmentTypeItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const positions = useSharedValue<Record<string, number>>({});
  const activeId = useSharedValue<string | null>(null);
  const listTop = useSharedValue(0);
  const listRef = useRef<View>(null);

  const { data: appointmentTypes = [], isLoading } = useQuery<AppointmentTypeItem[]>({
    queryKey: ['appointmentTypes', 'order', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('appointment_types')
        .select('id, name, duration_minutes, price, is_active, user_id, display_order');

      query = query.eq('user_id', user.id);

      const { data, error } = await query
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as AppointmentTypeItem[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (appointmentTypes.length) {
      setOrderedTypes(sortAppointmentTypes(appointmentTypes));
    }
  }, [appointmentTypes]);

  useEffect(() => {
    if (!draggingId && orderedTypes.length) {
      positions.value = buildPositionsMap(orderedTypes);
    }
  }, [draggingId, orderedTypes, positions]);

  const isDirty = useMemo(() => {
    if (draggingId) return false;
    if (!appointmentTypes.length || !orderedTypes.length) return false;
    const sorted = sortAppointmentTypes(appointmentTypes);
    if (sorted.length !== orderedTypes.length) return true;
    return orderedTypes.some((item, idx) => sorted[idx]?.id !== item.id);
  }, [appointmentTypes, draggingId, orderedTypes]);

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const updates = orderedTypes.map((item, idx) => ({
        id: item.id,
        display_order: idx + 1,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase
            .from('appointment_types')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
        )
      );

      queryClient.invalidateQueries({ queryKey: ['appointmentTypes'], exact: false });
      toast.success('סדר סוגי הטיפולים עודכן');
      router.back();
    } catch (error) {
      console.error('Error saving appointment types order:', error);
      toast.error('שגיאה בעדכון הסדר');
    } finally {
      setIsSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={!isDirty || isSaving || !!draggingId}>
          <Text
            className={`px-4 text-base font-semibold ${
              !isDirty || isSaving || !!draggingId ? 'text-gray-400' : 'text-black'
            }`}>
            {isSaving ? 'שומר...' : 'שמור'}
          </Text>
        </Pressable>
      ),
    });
  }, [draggingId, handleSave, isDirty, isSaving, navigation]);

  if (!user?.id) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">אין הרשאה לעדכן סדר סוגי טיפולים</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4" style={{ direction: 'rtl' }}>
      <View className="rounded-2xl bg-white px-5 py-4">
        <Text className="text-left text-lg font-semibold text-slate-900">סדר סוגי טיפולים</Text>
        <Text className="mt-1 text-left text-sm text-slate-500">
          גרור כדי לשנות את סדר ההצגה בבחירת סוג טיפול.
        </Text>
      </View>

      <View style={{ height: 16 }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-3 text-sm text-slate-500">טוען סוגי טיפולים...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!draggingId}>
          <View
            ref={listRef}
            onLayout={() => {
              listRef.current?.measureInWindow((_x, y) => {
                listTop.value = y;
              });
            }}
            style={{ height: orderedTypes.length * ITEM_SPACING - ROW_GAP }}>
            {orderedTypes.map((appointmentType, index) => (
              <AppointmentTypeOrderRow
                key={appointmentType.id}
                appointmentType={appointmentType}
                index={index}
                totalCount={orderedTypes.length}
                positions={positions}
                activeId={activeId}
                listTop={listTop}
                onDragStateChange={setDraggingId}
                onDragEnd={(positionsMap) => {
                  const sortedIds = Object.keys(positionsMap).sort(
                    (a, b) => positionsMap[a] - positionsMap[b]
                  );
                  setOrderedTypes((prev) => {
                    const byId = new Map(prev.map((item) => [item.id, item]));
                    return sortedIds
                      .map((id) => byId.get(id))
                      .filter(Boolean) as AppointmentTypeItem[];
                  });
                }}
                crewMemberName={undefined}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

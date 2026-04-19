import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchActiveCrewMembers } from '@/services/crew/members';
import { User } from '@/types/auth';
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

const sortMembers = (members: User[]) => {
  return [...members].sort((a, b) => {
    const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.POSITIVE_INFINITY;
    const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aName = a.full_name || '';
    const bName = b.full_name || '';
    return aName.localeCompare(bName, 'he');
  });
};

const buildPositionsMap = (members: User[]) => {
  const positions: Record<string, number> = {};
  members.forEach((member, index) => {
    positions[member.id] = index;
  });
  return positions;
};

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(value, max));
};

const CrewOrderRow = ({
  member,
  index,
  totalCount,
  positions,
  activeId,
  listTop,
  onDragStateChange,
  onDragEnd,
}: {
  member: User;
  index: number;
  totalCount: number;
  positions: Animated.SharedValue<Record<string, number>>;
  activeId: Animated.SharedValue<string | null>;
  listTop: Animated.SharedValue<number>;
  onDragStateChange: (id: string | null) => void;
  onDragEnd: (positionsMap: Record<string, number>) => void;
}) => {
  const translateY = useSharedValue(0);
  const touchOffset = useSharedValue(0);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          activeId.value = member.id;
          runOnJS(onDragStateChange)(member.id);
          const position = positions.value[member.id] ?? index;
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
          const currentIndex = positions.value[member.id] ?? index;
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
            nextPositions[member.id] = nextIndex;
            positions.value = nextPositions;
          }
        })
        .onEnd(() => {
          const finalIndex = positions.value[member.id] ?? index;
          translateY.value = withSpring(finalIndex * ITEM_SPACING, SPRING_CONFIG);
          activeId.value = null;
          runOnJS(onDragStateChange)(null);
          runOnJS(onDragEnd)(positions.value);
        }),
    [
      activeId,
      index,
      listTop,
      member.id,
      onDragEnd,
      onDragStateChange,
      positions,
      totalCount,
      translateY,
    ]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const position = positions.value[member.id] ?? index;
    const baseY = withSpring(position * ITEM_SPACING, SPRING_CONFIG);
    const isActive = activeId.value === member.id;
    return {
      transform: [
        { translateY: isActive ? translateY.value : baseY },
        { scale: isActive ? 0.95 : 1 },
      ],
      zIndex: isActive ? 10 : 0,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ height: ROW_HEIGHT, position: 'absolute', left: 0, right: 0 }, animatedStyle]}
        className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4">
        <View>
          <Text className="text-left text-base font-semibold text-slate-900">
            {member.full_name || 'ללא שם'}
          </Text>
          <Text className="text-left text-xs text-slate-500">
            {member.role === 'admin' ? 'בעלים' : 'צוות'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-400">גרור</Text>
          <Ionicons name="reorder-three" size={20} color="#94a3b8" />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export default function CrewOrderScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [orderedMembers, setOrderedMembers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const positions = useSharedValue<Record<string, number>>({});
  const activeId = useSharedValue<string | null>(null);
  const listTop = useSharedValue(0);
  const listRef = useRef<View>(null);

  const { data: crewMembers = [], isLoading } = useQuery<User[]>({
    queryKey: ['activeCrewMembers'],
    queryFn: async () => {
      const { data, error } = await fetchActiveCrewMembers();
      if (error) throw error;
      return data || [];
    },
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    if (crewMembers.length) {
      setOrderedMembers(sortMembers(crewMembers));
    }
  }, [crewMembers]);

  useEffect(() => {
    if (!draggingId && orderedMembers.length) {
      positions.value = buildPositionsMap(orderedMembers);
    }
  }, [draggingId, orderedMembers, positions]);

  const isDirty = useMemo(() => {
    if (draggingId) return false;
    if (!crewMembers.length || !orderedMembers.length) return false;
    const sorted = sortMembers(crewMembers);
    if (sorted.length !== orderedMembers.length) return true;
    return orderedMembers.some((member, idx) => sorted[idx]?.id !== member.id);
  }, [crewMembers, draggingId, orderedMembers]);

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const updates = orderedMembers.map((member, idx) => ({
        id: member.id,
        display_order: idx + 1,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase
            .from('profiles')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
        )
      );

      queryClient.invalidateQueries({ queryKey: ['activeCrewMembers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('סדר אנשי הצוות עודכן');
      router.back();
    } catch (error) {
      console.error('Error saving crew order:', error);
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

  if (user?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">אין הרשאה לעדכן סדר אנשי צוות</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4" style={{ direction: 'rtl' }}>
      <View className="rounded-2xl bg-white px-5 py-4">
        <Text className="text-left text-lg font-semibold text-slate-900">סדר אנשי צוות</Text>
        <Text className="mt-1 text-left text-sm text-slate-500">
          גרור כדי לשנות את סדר ההצגה במסכי בחירת אנשי הצוות.
        </Text>
      </View>

      <View style={{ height: 16 }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-3 text-sm text-slate-500">טוען אנשי צוות...</Text>
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
            style={{ height: orderedMembers.length * ITEM_SPACING - ROW_GAP }}>
            {orderedMembers.map((member, index) => (
              <CrewOrderRow
                key={member.id}
                member={member}
                index={index}
                totalCount={orderedMembers.length}
                positions={positions}
                activeId={activeId}
                listTop={listTop}
                onDragStateChange={setDraggingId}
                onDragEnd={(positionsMap) => {
                  const sortedIds = Object.keys(positionsMap).sort(
                    (a, b) => positionsMap[a] - positionsMap[b]
                  );
                  setOrderedMembers((prev) => {
                    const byId = new Map(prev.map((item) => [item.id, item]));
                    return sortedIds.map((id) => byId.get(id)).filter(Boolean) as User[];
                  });
                }}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

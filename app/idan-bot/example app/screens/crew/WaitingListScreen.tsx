import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchWaitingListByDate, type WaitingListItem } from '@/services/crew/waitingList';
import { getCurrentIsraelDateString, parseIsraelDate, toIsraelDateString } from '@/utils/dateUtils';
import { normalizePhoneForCall, normalizePhoneForWhatsApp } from '@/utils/formatPhoneNumber';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useEvent,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const DayLabel = ({
  day,
  index,
  scrollOffset,
  onPress,
}: {
  day: { displayName: string; shortDate: string };
  index: number;
  scrollOffset: SharedValue<number>;
  onPress: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const relativePosition = scrollOffset.value - index;
    const absPos = Math.abs(relativePosition);
    return {
      opacity: interpolate(absPos, [0, 0.8, 1.5], [1, 0.4, 0], 'clamp'),
      transform: [
        {
          translateX: interpolate(
            relativePosition,
            [-2, -1, 0, 1, 2],
            [200, 100, 0, -100, -200],
            'clamp'
          ),
        },
        { scale: interpolate(absPos, [0, 0.5, 1], [1.1, 0.9, 0.8], 'clamp') },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle} className="absolute items-center">
      <Pressable onPress={onPress} className="items-center p-2">
        <Text className="text-base font-bold text-gray-800">{day.displayName}</Text>
        <Text className="text-xs text-gray-500">{day.shortDate}</Text>
      </Pressable>
    </Animated.View>
  );
};

const formatDateLong = (value: string) =>
  parseIsraelDate(value).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jerusalem',
  });

const getNext7Days = () => {
  const days = [];
  const today = parseIsraelDate(getCurrentIsraelDateString());
  const hebrewWeekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    let displayName;
    if (i === 0) {
      displayName = 'היום';
    } else if (i === 1) {
      displayName = 'מחר';
    } else {
      const dayOfWeek = date.getDay();
      displayName = hebrewWeekdays[dayOfWeek];
    }

    const shortDate = date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Jerusalem',
    });

    days.push({
      date: toIsraelDateString(date),
      displayName,
      shortDate,
    });
  }

  return days;
};


const WaitingListRow = ({
  item,
  onDelete,
}: {
  item: WaitingListItem;
  onDelete: (id: string) => void;
}) => {
  const callNumber = normalizePhoneForCall(item.customer?.phone);
  const whatsappNumber = normalizePhoneForWhatsApp(item.customer?.phone);

  return (
    <View className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className="text-left text-base font-semibold text-slate-900"
            style={{ direction: 'rtl' }}>
            {item.customer?.full_name || 'לקוח/ה'}
          </Text>
          <Text className="mt-1 text-left text-sm text-slate-500" style={{ direction: 'rtl' }}>
            {item.appointment_type?.name || 'סוג טיפול'}
          </Text>
        </View>
        {(callNumber || whatsappNumber) && (
          <View className="flex-row items-center gap-2">
            {whatsappNumber ? (
              <Pressable
                onPress={() => Linking.openURL(`https://wa.me/${whatsappNumber}`)}
                className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </Pressable>
            ) : null}
            {callNumber ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${callNumber}`)}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Ionicons name="call-outline" size={16} color="#0f172a" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => onDelete(item.id)}
              className="h-9 w-9 items-center justify-center rounded-full bg-rose-50"
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}>
              <Ionicons name="trash-outline" size={16} color="#e11d48" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

function WaitingListDayList({
  date,
  crewMemberId,
  bottomInset,
}: {
  date: string;
  crewMemberId: string;
  bottomInset: number;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: response,
    error,
    refetch,
  } = useQuery({
    queryKey: ['waiting-list', crewMemberId, date],
    queryFn: () => fetchWaitingListByDate(crewMemberId, date),
    enabled: !!crewMemberId,
    staleTime: 5 * 60 * 1000,
  });

  const items = response?.data || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waiting_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הוסר מרשימת ההמתנה');
      queryClient.invalidateQueries({ queryKey: ['waiting-list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['waiting-list-count'], exact: false });
    },
    onError: () => {
      toast.error('שגיאה במחיקה מהרשימה');
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert('הסרה מרשימת המתנה', 'האם להסיר את הלקוח מהרשימה?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'הסר', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['waiting-list'], exact: false });
    } finally {
      setRefreshing(false);
    }
  };

  if (!items.length) {
    return (
      <View className="flex-1" collapsable={false}>
        <FlashList
          data={[]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flex: 1, paddingBottom: bottomInset + 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000000"
              colors={['#000000']}
            />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-lg text-gray-500">
                אין לקוחות ברשימת המתנה לתאריך {formatDateLong(date)}
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={items}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flex: 1, paddingBottom: bottomInset + 120 }}
        contentContainerClassName="px-6"
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => <WaitingListRow item={item} onDelete={handleDelete} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      />
    </View>
  );
}

export default function WaitingListScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { crewMemberId: crewMemberIdParam } = useLocalSearchParams<{
    crewMemberId?: string | string[];
  }>();
  const normalizedCrewMemberId = Array.isArray(crewMemberIdParam)
    ? crewMemberIdParam[0]
    : crewMemberIdParam;
  const effectiveCrewMemberId = normalizedCrewMemberId || user?.id;
  const scrollOffset = useSharedValue(0);
  const pagerRef = useRef<PagerView>(null);

  const days = getNext7Days();

  const pageScrollHandler = useEvent((event) => {
    'worklet';
    scrollOffset.value = event.offset + event.position;
  });

  const handleDayPress = (index: number) => {
    if (pagerRef.current) {
      pagerRef.current.setPage(index);
    }
  };

  if (!effectiveCrewMemberId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">אין הרשאה לצפות ברשימת המתנה</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ direction: 'rtl' }}>
      <View className="relative mb-4 mt-4 h-14">
        <View className="absolute inset-0 items-center justify-center">
          {days.reverse().map((day, index) => (
            <DayLabel
              key={day.date}
              day={day}
              index={index}
              scrollOffset={scrollOffset}
              onPress={() => handleDayPress(index)}
            />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <AnimatedPagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageScroll={pageScrollHandler}
          orientation="horizontal">
          {days.map((day) => (
            <WaitingListDayList
              key={day.date}
              date={day.date}
              crewMemberId={effectiveCrewMemberId}
              bottomInset={insets.bottom}
            />
          ))}
        </AnimatedPagerView>
      </View>
    </View>
  );
}

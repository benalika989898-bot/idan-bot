import AppointmentCard from './AppointmentCard';
import { fetchAppointmentsByDate } from '@/services/crew/appointments';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useEvent,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);
const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getNext7Days() {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    let displayName;
    if (i === 0) {
      displayName = 'היום';
    } else if (i === 1) {
      displayName = 'מחר';
    } else {
      displayName = HEBREW_WEEKDAYS[date.getDay()];
    }

    const shortDate = date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    });

    days.push({
      date: date.toISOString().split('T')[0],
      displayName,
      shortDate,
    });
  }

  return days;
}

export default function DashboardAppointmentsPager({ userId }: { userId?: string }) {
  const insets = useSafeAreaInsets();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const scrollOffset = useSharedValue(0);
  const pagerRef = useRef<PagerView>(null);
  const days = getNext7Days();

  const pageScrollHandler = useEvent((event) => {
    'worklet';
    scrollOffset.value = event.offset + event.position;
  });

  const handlePageSelected = (e: any) => {
    setCurrentPageIndex(e.nativeEvent.position);
  };

  const handleDayPress = (index: number) => {
    setCurrentPageIndex(index);
    pagerRef.current?.setPage(index);
  };

  return (
    <View className="flex-1">
      <View className="relative mb-4 mt-4 h-14" style={{ marginTop: insets.top + 8 }}>
        <View className="absolute inset-0 items-center justify-center">
          {days.map((day, index) => (
            <AnimatedDayLabel
              key={day.date}
              day={day}
              index={index}
              scrollOffset={scrollOffset}
              onPress={handleDayPress}
            />
          ))}
        </View>
      </View>

      <AnimatedPagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={handlePageSelected}
        onPageScroll={pageScrollHandler}
        layoutDirection="rtl"
        orientation="horizontal">
        {days.map((day, index) => (
          <View key={day.date} className="flex-1" collapsable={false}>
            {Math.abs(index - currentPageIndex) <= 1 ? (
              <AppointmentsDayList date={day.date} userId={userId} bottomInset={insets.bottom} />
            ) : (
              <View className="flex-1" />
            )}
          </View>
        ))}
      </AnimatedPagerView>
    </View>
  );
}

function AnimatedDayLabel({
  day,
  index,
  scrollOffset,
  onPress,
}: {
  day: { date: string; displayName: string; shortDate: string };
  index: number;
  scrollOffset: SharedValue<number>;
  onPress: (index: number) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const currentPosition = scrollOffset.value;
    const relativePosition = currentPosition - index;

    const translateX = interpolate(
      relativePosition,
      [-2, -1, 0, 1, 2],
      [-200, -100, 0, 100, 200],
      'clamp'
    );

    const opacity = interpolate(Math.abs(relativePosition), [0, 0.8, 1.5], [1, 0.4, 0], 'clamp');
    const scale = interpolate(Math.abs(relativePosition), [0, 0.5, 1], [1.1, 0.9, 0.8], 'clamp');

    return {
      opacity,
      transform: [{ translateX }, { scale }],
    };
  });

  return (
    <Animated.View style={animatedStyle} className="absolute items-center">
      <Pressable onPress={() => onPress(index)} className="items-center p-2">
        <Text className="text-base font-bold text-gray-800">{day.displayName}</Text>
        <Text className="text-xs text-gray-500">{day.shortDate}</Text>
      </Pressable>
    </Animated.View>
  );
}

function AppointmentsDayList({
  date,
  userId,
  bottomInset,
}: {
  date: string;
  userId?: string;
  bottomInset: number;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: response, refetch } = useQuery({
    queryKey: ['appointments', userId, date],
    queryFn: () => fetchAppointmentsByDate(userId!, date),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const appointments = response?.data || [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['appointments', userId], exact: true });
    } finally {
      setRefreshing(false);
    }
  };

  if (appointments.length === 0) {
    const formattedDate = new Date(date).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Jerusalem',
    });

    return (
      <View className="flex-1" collapsable={false}>
        <FlashList
          data={[]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000000"
              colors={['#000000']}
            />
          }
          contentContainerStyle={{ flex: 1, paddingBottom: bottomInset + 120 }}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center">
              <Text className="text-center text-lg text-gray-500">
                אין תורים לתאריך {formattedDate}
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
        data={appointments}
        keyExtractor={(item) => item.id}
        estimatedItemSize={100}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flex: 1, paddingBottom: bottomInset + 120 }}
        contentContainerClassName="px-6"
        ItemSeparatorComponent={() => <View className="h-1" />}
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
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

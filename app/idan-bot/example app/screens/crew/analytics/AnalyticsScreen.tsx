import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, { useEvent, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnalyticsContent from './components/AnalyticsContent';
import MonthLabel from './components/MonthLabel';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const HEBREW_MONTHS = [
  'ינו׳',
  'פבר׳',
  'מרץ',
  'אפר׳',
  'מאי',
  'יוני',
  'יולי',
  'אוג׳',
  'ספט׳',
  'אוק׳',
  'נוב׳',
  'דצמ׳',
];

function getMonths() {
  const months = [];
  const today = new Date();

  for (let i = -6; i <= 5; i += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthName = HEBREW_MONTHS[date.getMonth()];
    const year = date.getFullYear();

    let displayName;
    if (i === 0) {
      displayName = 'החודש';
    } else if (i === -1) {
      displayName = 'חודש שעבר';
    } else if (i === 1) {
      displayName = 'חודש הבא';
    } else {
      displayName = `${monthName} ${year}`;
    }

    months.push({
      year,
      month: date.getMonth() + 1,
      displayName,
      fullName: `${monthName} ${year}`,
    });
  }
  return months;
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const months = getMonths();
  const pagerMonths = [...months].reverse();
  const currentMonthPageIndex = pagerMonths.findIndex((item) => item.displayName === 'החודש');
  const [currentPageIndex, setCurrentPageIndex] = useState(currentMonthPageIndex);
  const monthHeaderIndex = useSharedValue(currentMonthPageIndex);
  const lastMonthIndex = pagerMonths.length - 1;

  const pageScrollHandler = useEvent((event) => {
    'worklet';
    const nextIndex = event.position + event.offset;
    monthHeaderIndex.value = Math.max(0, Math.min(nextIndex, lastMonthIndex));
  });

  const handlePageSelected = (e: any) => {
    const nextIndex = e.nativeEvent.position;
    setCurrentPageIndex(nextIndex);
    monthHeaderIndex.value = withTiming(nextIndex, { duration: 180 });
  };

  return (
    <View style={{ paddingTop: insets.top, direction: 'ltr' }} className="flex-1">
      {/* Month Header */}
      <View className="relative mb-6 h-12">
        <View className="absolute inset-0 items-center justify-center">
          {pagerMonths.map((month, index) => (
            <MonthLabel
              key={`${month.year}-${month.month}`}
              label={month.displayName}
              index={index}
              activeIndex={monthHeaderIndex}
            />
          ))}
        </View>
      </View>

      {/* Analytics Pages */}
      <AnimatedPagerView
        style={{ flex: 1 }}
        initialPage={currentMonthPageIndex}
        onPageSelected={handlePageSelected}
        onPageScroll={pageScrollHandler}
        layoutDirection="ltr"
        orientation="horizontal">
        {pagerMonths.map((month, index) => (
          <View key={`${month.year}-${month.month}`} collapsable={false}>
            {Math.abs(index - currentPageIndex) <= 1 ? (
              <AnalyticsContent
                year={month.year}
                month={month.month}
                userId={user?.id}
                isAdmin={user?.role === 'admin'}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        ))}
      </AnimatedPagerView>
    </View>
  );
}

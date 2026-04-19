import { useAuth } from '@/contexts/AuthContext';
import {
  fetchCrewMembersList,
  fetchMonthlyAnalytics,
} from '@/services/crew/analytics';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useEvent,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ChartCard } from './AnalyticsShared';
import { formatCurrency } from './analyticsUtils';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

type CrewMembersServiceSectionProps = {
  userId?: string;
  year: number;
  month: number;
};

type CrewMemberLabelProps = {
  member: { avatar_url?: string; displayName: string };
  index: number;
  scrollOffset: SharedValue<number>;
  onPress: () => void;
};

function CrewMemberLabel({ member, index, scrollOffset, onPress }: CrewMemberLabelProps) {
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
        <View className="flex items-center gap-1">
          <View className="h-8 w-8 overflow-hidden rounded-full">
            <Image
              source={{ uri: member.avatar_url }}
              style={{ width: '100%', height: '100%', borderRadius: 999 }}
              transition={200}
              contentFit="cover"
            />
          </View>
          <Text className="text-lg font-bold text-gray-800">{member.displayName}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function CrewServiceDetails({
  crewMemberId,
  year,
  month,
  onHeightChange,
}: {
  crewMemberId: string;
  year: number;
  month: number;
  onHeightChange?: (height: number) => void;
}) {
  const { data: individualData } = useQuery({
    queryKey: ['analytics', crewMemberId, year, month],
    queryFn: () => fetchMonthlyAnalytics(crewMemberId, year, month),
    enabled: crewMemberId !== 'all',
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const analyticsData = individualData?.data;

  if (!analyticsData?.appointmentsByService.length) {
    return (
      <View
        className="flex-1 items-center justify-center py-8"
        collapsable={false}
        onLayout={(event) => onHeightChange?.(Math.ceil(event.nativeEvent.layout.height))}>
        <Text className="text-center text-gray-500">אין נתונים להציג עבור איש צוות זה</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      collapsable={false}
      onLayout={(event) => onHeightChange?.(Math.ceil(event.nativeEvent.layout.height))}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {analyticsData.appointmentsByService.map((service, index) => (
            <View
              key={index}
              className={`flex-row-reverse items-center justify-between py-2 ${
                index < analyticsData.appointmentsByService.length - 1
                  ? 'border-b border-gray-100'
                  : ''
              }`}>
              <View className="flex-1">
                <Text className="text-right font-medium text-gray-900">{service.service}</Text>
                <Text className="text-right text-sm text-gray-500">{service.count} תורים</Text>
              </View>
              <Text className="font-semibold text-green-600">{formatCurrency(service.revenue)}</Text>
            </View>
          ))}

          <View className="mt-3 flex-row-reverse items-center justify-between border-t border-gray-300 py-3">
            <View className="flex-1">
              <Text className="text-right font-bold text-gray-900">סה״כ</Text>
              <Text className="text-right text-sm text-gray-600">
                {analyticsData.totalAppointments} תורים
              </Text>
            </View>
            <Text className="text-lg font-bold text-green-600">
              {formatCurrency(analyticsData.totalRevenue)}
            </Text>
          </View>

          <View className="mt-2 rounded-xl bg-slate-50 p-3">
            <View className="mb-2 flex-row-reverse items-center justify-between">
              <Text className="text-right text-sm font-semibold text-slate-800">מכירות מוצרים</Text>
              <View className="flex-row-reverse items-center gap-2">
                <Text className="text-xs text-slate-500">{analyticsData.totalProductsSold} פריטים</Text>
                <Text className="text-xs font-semibold text-slate-700">
                  ₪{analyticsData.totalProductRevenue.toLocaleString('he-IL')}
                </Text>
              </View>
            </View>
            {analyticsData.productsByCategory.length > 0 ? (
              <View className="gap-2">
                {analyticsData.productsByCategory.map((product, index) => (
                  <View
                    key={index}
                    className={`flex-row-reverse items-center justify-between py-1 ${
                      index < analyticsData.productsByCategory.length - 1
                        ? 'border-b border-slate-200'
                        : ''
                    }`}>
                    <View className="flex-1">
                      <Text className="text-right text-sm font-medium text-slate-800">
                        {product.product}
                      </Text>
                      <Text className="text-right text-xs text-slate-500">
                        {product.quantity} יח׳
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-700">
                      ₪{product.revenue.toLocaleString('he-IL')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-right text-xs text-slate-500">אין מכירות מוצרים לתקופה זו</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function CrewMembersServiceSection({
  userId,
  year,
  month,
}: CrewMembersServiceSectionProps) {
  const { user } = useAuth();
  const [currentCrewPageIndex, setCurrentCrewPageIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(320);
  const crewScrollOffset = useSharedValue(0);
  const initializedRef = useRef(false);
  const crewPagerRef = useRef<PagerView>(null);
  const pageHeightsRef = useRef<Record<number, number>>({});
  const isAdmin = user?.role === 'admin';

  const { data: crewMembers } = useQuery({
    queryKey: ['crewMembersList'],
    queryFn: fetchCrewMembersList,
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: userAnalytics,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ['analytics', userId, year, month],
    queryFn: () => fetchMonthlyAnalytics(userId!, year, month),
    enabled: !isAdmin && !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const members = (() => {
    if (!crewMembers?.data) return [];
    const sorted = [...crewMembers.data]
      .map((member) => ({
        id: member.id,
        name: member.name,
        displayName: member.id === userId ? 'אני' : member.name,
        avatar_url: member.avatar_url,
      }))
      .sort((a, b) => {
        if (a.id === userId) return -1;
        if (b.id === userId) return 1;
        return 0;
      });
    return sorted.reverse();
  })();

  const hasMembers = members.length > 0;
  const initialCrewPageIndex = Math.max(0, members.length - 1);

  useEffect(() => {
    if (!isAdmin) return;
    if (initializedRef.current || !hasMembers) return;
    initializedRef.current = true;
    setCurrentCrewPageIndex(initialCrewPageIndex);
    crewScrollOffset.value = initialCrewPageIndex;
  }, [crewScrollOffset, hasMembers, initialCrewPageIndex, isAdmin]);

  const handleCrewPageSelected = (event: { nativeEvent: { position: number } }) => {
    setCurrentCrewPageIndex(event.nativeEvent.position);
  };

  const handleCrewMemberPress = (index: number) => {
    setCurrentCrewPageIndex(index);
    crewPagerRef.current?.setPage(index);
  };

  const handlePageHeight = (index: number, nextHeight: number) => {
    if (!nextHeight) {
      return;
    }

    pageHeightsRef.current[index] = nextHeight;
    if (index === currentCrewPageIndex && nextHeight !== pagerHeight) {
      setPagerHeight(nextHeight);
    }
  };

  const crewPageScrollHandler = useEvent((event) => {
    'worklet';
    crewScrollOffset.value = event.offset + event.position;
  });

  useEffect(() => {
    const nextHeight = pageHeightsRef.current[currentCrewPageIndex];
    if (nextHeight && nextHeight !== pagerHeight) {
      setPagerHeight(nextHeight);
    }
  }, [currentCrewPageIndex, pagerHeight]);

  if (!isAdmin) {
    const analyticsData = userAnalytics?.data;
    if (!analyticsData?.appointmentsByService.length) return null;

    return (
      <ChartCard
        title="פירוט לפי סוג טיפול"
        subtitle="חלוקה מפורטת של טיפולים והכנסות לפי איש הצוות הנוכחי">
        <View className="mb-4 items-center justify-center py-2">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 overflow-hidden rounded-full">
              <Image
                source={{ uri: user!.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                transition={200}
                contentFit="cover"
              />
            </View>
            <Text className="text-lg font-bold text-gray-800">{user?.full_name || 'הנתונים שלי'}</Text>
          </View>
        </View>

        <View className="gap-3">
          {analyticsData.appointmentsByService.map((service, index) => (
            <View
              key={index}
              className={`flex-row-reverse items-center justify-between py-2 ${
                index < analyticsData.appointmentsByService.length - 1
                  ? 'border-b border-gray-100'
                  : ''
              }`}>
              <View className="flex-1">
                <Text className="text-right font-medium text-gray-900">{service.service}</Text>
                <Text className="text-right text-sm text-gray-500">{service.count} תורים</Text>
              </View>
              <Text className="font-semibold text-green-600">
                ₪{service.revenue.toLocaleString('he-IL')}
              </Text>
            </View>
          ))}

          <View className="mt-2 flex-row-reverse items-center justify-between border-t border-gray-300 py-3">
            <View className="flex-1">
              <Text className="text-right font-bold text-gray-900">סה״כ</Text>
              <Text className="text-right text-sm text-gray-600">
                {analyticsData.totalAppointments} תורים
              </Text>
            </View>
            <Text className="text-lg font-bold text-green-600">
              ₪{analyticsData.totalRevenue.toLocaleString('he-IL')}
            </Text>
          </View>

          <View className="mt-2 rounded-xl bg-slate-50 p-3">
            <View className="mb-2 flex-row-reverse items-center justify-between">
              <Text className="text-right text-sm font-semibold text-slate-800">מכירות מוצרים</Text>
              <View className="flex-row-reverse items-center gap-2">
                <Text className="text-xs text-slate-500">{analyticsData.totalProductsSold} פריטים</Text>
                <Text className="text-xs font-semibold text-slate-700">
                  ₪{analyticsData.totalProductRevenue.toLocaleString('he-IL')}
                </Text>
              </View>
            </View>
            {analyticsData.productsByCategory.length > 0 ? (
              <View className="gap-2">
                {analyticsData.productsByCategory.map((product, index) => (
                  <View
                    key={index}
                    className={`flex-row-reverse items-center justify-between py-1 ${
                      index < analyticsData.productsByCategory.length - 1
                        ? 'border-b border-slate-200'
                        : ''
                    }`}>
                    <View className="flex-1">
                      <Text className="text-right text-sm font-medium text-slate-800">
                        {product.product}
                      </Text>
                      <Text className="text-right text-xs text-slate-500">{product.quantity} יח׳</Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-700">
                      ₪{product.revenue.toLocaleString('he-IL')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-right text-xs text-slate-500">אין מכירות מוצרים לתקופה זו</Text>
            )}
          </View>
        </View>
      </ChartCard>
    );
  }

  if (isLoadingUser) {
    return (
      <ChartCard
        title="פירוט לפי איש צוות וסוג טיפול"
        subtitle="מעבר בין אנשי צוות כדי לראות פילוח אישי של טיפולים ומכירות">
        <View className="flex-1 items-center justify-center py-8">
          <Text className="text-gray-500">טוען נתונים...</Text>
        </View>
      </ChartCard>
    );
  }

  if (userError) {
    return (
      <ChartCard
        title="פירוט לפי איש צוות וסוג טיפול"
        subtitle="מעבר בין אנשי צוות כדי לראות פילוח אישי של טיפולים ומכירות">
        <View className="flex-1 items-center justify-center py-8">
          <Text className="text-red-500">שגיאה בטעינת הנתונים</Text>
          <Text className="mt-2 text-sm text-gray-500">{userError.message}</Text>
        </View>
      </ChartCard>
    );
  }

  if (!hasMembers) {
    return (
      <ChartCard
        title="פירוט לפי איש צוות וסוג טיפול"
        subtitle="מעבר בין אנשי צוות כדי לראות פילוח אישי של טיפולים ומכירות">
        <View className="flex-1 items-center justify-center py-8">
          <Text className="text-gray-500">אין אנשי צוות להצגה</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="פירוט לפי איש צוות וסוג טיפול"
      subtitle="מעבר בין אנשי צוות כדי לראות פילוח אישי של טיפולים ומכירות">
      <View className="relative my-4 h-16">
        <View className="absolute inset-0 items-center justify-center">
          {members.map((member, index) => (
            <CrewMemberLabel
              key={member.id}
              member={member}
              index={index}
              scrollOffset={crewScrollOffset}
              onPress={() => handleCrewMemberPress(index)}
            />
          ))}
        </View>
      </View>

      <AnimatedPagerView
        ref={crewPagerRef}
        style={{ height: pagerHeight }}
        initialPage={initialCrewPageIndex}
        onPageSelected={handleCrewPageSelected}
        onPageScroll={crewPageScrollHandler}
        layoutDirection="ltr"
        orientation="horizontal">
        {members.map((member, index) => (
          <View key={member.id} collapsable={false}>
            {Math.abs(index - currentCrewPageIndex) <= 1 ? (
              <CrewServiceDetails
                crewMemberId={member.id}
                year={year}
                month={month}
                onHeightChange={(height) => handlePageHeight(index, height)}
              />
            ) : (
              <View style={{ height: pagerHeight }} />
            )}
          </View>
        ))}
      </AnimatedPagerView>
    </ChartCard>
  );
}

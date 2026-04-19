import { fetchAllCrewAnalytics, fetchMonthlyAnalytics } from '@/services/crew/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useReducer, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsRevenueChart,
  type CrewBreakdownEntry,
} from './AnalyticsCharts';
import {
  AnalyticsInsightsRow,
  ChartCard,
  ChartSelectionSummary,
  EmptyChart,
} from './AnalyticsShared';
import {
  AdminAnalyticsModeSwitch,
  AdminSummarySections,
  PersonalSummarySections,
} from './AnalyticsSummarySections';
import { CrewMembersServiceSection } from './CrewMembersServiceSection';
import type {
  AnalyticsContentProps,
  DayBarDatum,
  RevenuePointDatum,
  SimplePieDatum,
} from './analyticsTypes';
import {
  CHART_COLORS,
  formatCurrency,
  formatReadableDateWithWeekday,
  formatWeekdayDateLabel,
  formatWeekdayLabel,
  sortByPrimaryValue,
} from './analyticsUtils';

export default function AnalyticsContent({ year, month, userId, isAdmin }: AnalyticsContentProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminMode, setAdminMode] = useState<'team' | 'mine'>('team');
  type SelectionState = {
    dayIndex: number;
    revenueDayIndex: number;
  };
  type SelectionAction =
    | { type: 'SET_DAY'; index: number }
    | { type: 'SET_REVENUE_DAY'; index: number }
    | { type: 'RESET'; payload: SelectionState };

  const selectionReducer = (state: SelectionState, action: SelectionAction): SelectionState => {
    switch (action.type) {
      case 'SET_DAY':
        return state.dayIndex === action.index ? state : { ...state, dayIndex: action.index };
      case 'SET_REVENUE_DAY':
        return state.revenueDayIndex === action.index ? state : { ...state, revenueDayIndex: action.index };
      case 'RESET':
        return action.payload;
    }
  };

  const [selection, dispatchSelection] = useReducer(selectionReducer, {
    dayIndex: 0,
    revenueDayIndex: 0,
  });

  const setSelectedDayIndex = (index: number) => dispatchSelection({ type: 'SET_DAY', index });
  const setSelectedRevenueDayIndex = (index: number) => dispatchSelection({ type: 'SET_REVENUE_DAY', index });

  const {
    data: analytics,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['analytics', userId, year, month],
    queryFn: () => fetchMonthlyAnalytics(userId!, year, month),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: allCrewAnalytics,
    isLoading: isLoadingAllCrew,
    error: allCrewError,
    isFetching: isFetchingAllCrew,
  } = useQuery({
    queryKey: ['allCrewAnalytics', year, month],
    queryFn: () => fetchAllCrewAnalytics(year, month),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const individualData = analytics?.data;
  const allCrewData = allCrewAnalytics?.data;
  const hasMultipleCrew = (allCrewData?.crewMemberBreakdown?.length ?? 0) > 1;
  const effectiveAdminMode = isAdmin && hasMultipleCrew ? adminMode : 'team';
  const analyticsData =
    isAdmin && effectiveAdminMode === 'team' ? allCrewAnalytics?.data : analytics?.data;

  const currentIsLoading = isAdmin ? isLoading || isLoadingAllCrew : isLoading;
  const currentError = isAdmin ? error || allCrewError : error;
  const isRefreshingView = isRefreshing || isFetching || isFetchingAllCrew;

  // Single effect to reset and clamp selection indices when data changes
  useEffect(() => {
    if (!analyticsData) return;

    const firstDayWithAppointments = analyticsData.appointmentsByDay.findIndex(
      (item) => item.count > 0
    );
    const latestRevenueIndex =
      analyticsData.dailyStats.length > 0 ? analyticsData.dailyStats.length - 1 : 0;
    dispatchSelection({
      type: 'RESET',
      payload: {
        dayIndex: firstDayWithAppointments >= 0 ? firstDayWithAppointments : 0,
        revenueDayIndex: latestRevenueIndex,
      },
    });
  }, [analyticsData, effectiveAdminMode, month, year]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics', userId, year, month], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['allCrewAnalytics', year, month], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['crewMembersList'], exact: true }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Build crew breakdown maps for service/product expansion (admin team mode only)
  const buildCrewBreakdowns = () => {
    if (!isAdmin || effectiveAdminMode !== 'team' || !allCrewData?.crewMemberBreakdown) {
      return { services: undefined, products: undefined };
    }
    const svcMap = new Map<string, CrewBreakdownEntry[]>();
    const prodMap = new Map<string, CrewBreakdownEntry[]>();
    for (const crew of allCrewData.crewMemberBreakdown) {
      for (const svc of crew.appointmentsByService) {
        const entries = svcMap.get(svc.service) || [];
        entries.push({
          crewMemberName: crew.crewMemberName,
          crewMemberAvatar: crew.crewMemberAvatar,
          value: svc.count,
          revenue: svc.revenue,
        });
        svcMap.set(svc.service, entries);
      }
      for (const prod of crew.productsByCategory) {
        const entries = prodMap.get(prod.product) || [];
        entries.push({
          crewMemberName: crew.crewMemberName,
          crewMemberAvatar: crew.crewMemberAvatar,
          value: prod.quantity,
          revenue: prod.revenue,
        });
        prodMap.set(prod.product, entries);
      }
    }
    for (const [, entries] of svcMap) entries.sort((a, b) => b.value - a.value);
    for (const [, entries] of prodMap) entries.sort((a, b) => b.value - a.value);
    return { services: svcMap, products: prodMap };
  };
  const { services: serviceCrewBreakdowns, products: productCrewBreakdowns } = buildCrewBreakdowns();

  if (currentIsLoading) {
    return (
      <View className="flex-1 items-center justify-center gap-4" collapsable={false}>
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-left text-gray-500">טוען נתונים...</Text>
      </View>
    );
  }

  if (currentError || !analyticsData) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8" collapsable={false}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <View className="gap-2">
          <Text className="text-center text-lg font-medium text-gray-900">
            שגיאה בטעינת הנתונים
          </Text>
          <Text className="text-center text-sm text-gray-500">
            לא ניתן לטעון את נתוני הסטטיסטיקה כרגע
          </Text>
        </View>
      </View>
    );
  }

  const barData: DayBarDatum[] = analyticsData.appointmentsByDay.map((item) => ({
    day: formatWeekdayLabel(item.day),
    count: item.count,
    revenue: item.revenue,
  }));

  const lineData: RevenuePointDatum[] = analyticsData.dailyStats.map((item) => ({
    date: item.date,
    dayLabel: formatWeekdayDateLabel(item.date),
    revenue: item.revenue,
    appointments: item.appointments,
  }));

  const topServices = sortByPrimaryValue(analyticsData.appointmentsByService, 5);
  const topProducts = sortByPrimaryValue(analyticsData.productsByCategory, 6);

  const pieData: SimplePieDatum[] = topServices.map((item, index) => ({
    label: item.service,
    value: item.count,
    color: CHART_COLORS[index % CHART_COLORS.length],
    detail: `${formatCurrency(item.revenue)} הכנסות`,
  }));

  const productPieData: SimplePieDatum[] = topProducts.map((item, index) => ({
    label: item.product,
    value: item.quantity,
    color: CHART_COLORS[index % CHART_COLORS.length],
    detail: `${formatCurrency(item.revenue)} הכנסות`,
  }));

  const selectedDay = barData[selection.dayIndex];
  const selectedRevenueDay = analyticsData.dailyStats[selection.revenueDayIndex];
  const strongestDay = [...barData].sort((a, b) => b.count - a.count)[0];
  const highestRevenueDay = [...analyticsData.dailyStats].sort((a, b) => b.revenue - a.revenue)[0];
  const activeDaysCount = analyticsData.dailyStats.filter(
    (item) => item.revenue > 0 || item.appointments > 0
  ).length;
  const activeWeekDays = Math.max(barData.filter((item) => item.count > 0).length, 1);

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingView} onRefresh={handleRefresh} />}>
        {isAdmin ? (
          <AdminSummarySections
            allCrewData={allCrewData}
            individualData={individualData}
            mode={effectiveAdminMode}
          />
        ) : (
          <PersonalSummarySections analyticsData={analyticsData} />
        )}

        {analyticsData.appointmentsByDay.some((day) => day.count > 0) ? (
          <ChartCard
            title="תורים לפי יום בשבוע"
            subtitle="זיהוי מהיר של הימים החזקים לאורך השבוע"
            accentColor="#111827">
            <AnalyticsInsightsRow
              left={{
                label: 'היום החזק',
                value: strongestDay
                  ? `${strongestDay.day} · ${strongestDay.count} תורים`
                  : 'אין נתונים',
              }}
              right={{
                label: 'ממוצע ליום',
                value: `${Math.round(analyticsData.totalAppointments / activeWeekDays)} תורים`,
              }}
            />

            {selectedDay ? (
              <ChartSelectionSummary
                title={selectedDay.day}
                primaryLabel="מספר תורים"
                primaryValue={selectedDay.count.toLocaleString('he-IL')}
                secondaryLabel="הכנסות"
                secondaryValue={formatCurrency(selectedDay.revenue || 0)}
              />
            ) : null}

            <AnalyticsBarChart
              data={barData}
              selectedIndex={selection.dayIndex}
              onSelect={setSelectedDayIndex}
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="תורים לפי יום בשבוע"
            subtitle="זיהוי מהיר של הימים החזקים לאורך השבוע"
            accentColor="#111827">
            <EmptyChart message="אין נתונים להציג עבור תקופה זו" />
          </ChartCard>
        )}

        {analyticsData.dailyStats.length > 0 ? (
          <ChartCard
            title="הכנסות לפי תאריכים בחודש"
            subtitle="מגמת הכנסות יומית לאורך החודש"
            accentColor="#2563EB">
            <AnalyticsInsightsRow
              left={{
                label: 'יום השיא',
                value: highestRevenueDay
                  ? `${formatReadableDateWithWeekday(highestRevenueDay.date)} · ${formatCurrency(highestRevenueDay.revenue)}`
                  : 'אין נתונים',
              }}
              right={{
                label: 'ימים פעילים',
                value: `${activeDaysCount.toLocaleString('he-IL')} ימים`,
              }}
            />

            {selectedRevenueDay ? (
              <ChartSelectionSummary
                title={formatReadableDateWithWeekday(selectedRevenueDay.date)}
                primaryLabel="הכנסות"
                primaryValue={formatCurrency(selectedRevenueDay.revenue)}
                secondaryLabel="מספר תורים"
                secondaryValue={selectedRevenueDay.appointments.toLocaleString('he-IL')}
              />
            ) : null}

            <AnalyticsRevenueChart
              data={lineData}
              selectedIndex={selection.revenueDayIndex}
              onSelect={setSelectedRevenueDayIndex}
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="הכנסות לפי תאריכים בחודש"
            subtitle="מגמת הכנסות יומית לאורך החודש"
            accentColor="#2563EB">
            <EmptyChart message="אין נתוני הכנסות להציג" />
          </ChartCard>
        )}

        {analyticsData.appointmentsByService.length > 0 ? (
          <ChartCard
            title="התפלגות לפי סוג טיפול"
            subtitle="רשימת דירוג של הטיפולים הבולטים ביותר החודש"
            accentColor="#14B8A6">
            <AnalyticsInsightsRow
              left={{
                label: 'טיפול מוביל',
                value: topServices[0]
                  ? `${topServices[0].service} · ${topServices[0].count} תורים`
                  : 'אין נתונים',
              }}
              right={{
                label: 'סוגי טיפולים פעילים',
                value: analyticsData.appointmentsByService.length.toLocaleString('he-IL'),
              }}
            />

            <AnalyticsPieChart data={pieData} crewBreakdowns={serviceCrewBreakdowns} />
          </ChartCard>
        ) : (
          <ChartCard
            title="התפלגות לפי סוג טיפול"
            subtitle="רשימת דירוג של הטיפולים הבולטים ביותר החודש"
            accentColor="#14B8A6">
            <EmptyChart message="אין נתוני טיפולים להציג" />
          </ChartCard>
        )}

        {analyticsData.productsByCategory.length > 0 ? (
          <ChartCard
            title="מוצרים מובילים"
            subtitle="המוצרים שמניעים הכי הרבה מכירות בחודש הזה"
            accentColor="#F59E0B">
            <AnalyticsInsightsRow
              left={{
                label: 'מוצר מוביל',
                value: topProducts[0]
                  ? `${topProducts[0].product} · ${topProducts[0].quantity} יח׳`
                  : 'אין נתונים',
              }}
              right={{
                label: 'מוצרים שנמכרו',
                value: analyticsData.totalProductsSold.toLocaleString('he-IL'),
              }}
            />

            <AnalyticsPieChart data={productPieData} crewBreakdowns={productCrewBreakdowns} />
          </ChartCard>
        ) : (
          <ChartCard
            title="מוצרים מובילים"
            subtitle="המוצרים שמניעים הכי הרבה מכירות בחודש הזה"
            accentColor="#F59E0B">
            <EmptyChart message="אין נתוני מכירות מוצרים להציג" />
          </ChartCard>
        )}

        {!isAdmin || effectiveAdminMode === 'team' ? (
          <CrewMembersServiceSection userId={userId} year={year} month={month} />
        ) : null}
        <View
          style={{
            height:
              isAdmin && hasMultipleCrew ? 120 + Math.max(insets.bottom, 12) : 80,
          }}
        />
      </ScrollView>

      {isAdmin && hasMultipleCrew ? (
        <View
          pointerEvents="box-none"
          style={{ bottom: Math.max(insets.bottom) }}
          className="absolute left-0 right-0 items-center px-6">
          <View className="rounded-full  px-3 py-2 shadow-sm">
            <AdminAnalyticsModeSwitch mode={adminMode} onModeChange={setAdminMode} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

import { CalendarEvent, GoogleCalendar } from './GoogleCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useStartupSplash } from '@/contexts/StartupSplashContext';
import { supabase } from '@/lib/supabase';
import { fetchAppointmentTypesByCrewMember } from '@/services/crew/appointmentTypes';
import { fetchScheduleByRange } from '@/services/crew/appointments';
import {
  fetchCrewDateSchedules,
  fetchCrewSchedule,
  fetchCrewScheduleMode,
} from '@/services/crew/schedules';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { toast } from 'sonner-native';
import DashboardAppointmentsPager from './DashboardAppointmentsPager';

type DashboardAppointmentsListProps = {
  startDate: string;
  endDate: string;
  userId?: string;
  showCrewPicker?: boolean;
  ownerAvatarUrl?: string;
  ownerName?: string;
  canEditSchedule?: boolean;
};

export default function DashboardAppointmentsList({
  startDate,
  endDate,
  userId,
  showCrewPicker,
  ownerAvatarUrl,
  ownerName,
  canEditSchedule,
}: DashboardAppointmentsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const { dashboardReady, setDashboardReady } = useStartupSplash();
  const [realtimeError, setRealtimeError] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isLoadingViewMode, setIsLoadingViewMode] = useState(true);
  const [visibleDate, setVisibleDate] = useState(startDate);
  const dateChangedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRangesRef = useRef<Set<string>>(new Set());
  const realtimeInvalidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [extraScheduleItems, setExtraScheduleItems] = useState<any[]>([]);

  useEffect(() => {
    setExtraScheduleItems([]);
    fetchedRangesRef.current = new Set();
  }, [userId]);

  const resetExtraRanges = useCallback(() => {
    setExtraScheduleItems([]);
    fetchedRangesRef.current = new Set();
  }, []);

  const visibleRangeStart = useMemo(
    () => dayjs(visibleDate).subtract(14, 'day').format('YYYY-MM-DD'),
    [visibleDate]
  );
  const visibleRangeEnd = useMemo(
    () => dayjs(visibleDate).add(14, 'day').format('YYYY-MM-DD'),
    [visibleDate]
  );

  const refreshExtraRanges = useCallback((uid: string) => {
    // Collect all previously fetched week keys
    const previousWeeks = Array.from(fetchedRangesRef.current);
    // Clear ref so they can be re-fetched, but keep extraScheduleItems visible
    fetchedRangesRef.current = new Set();

    if (previousWeeks.length === 0) return;

    // Re-fetch all previously fetched weeks in parallel
    Promise.allSettled(
      previousWeeks.map((weekKey) => {
        const weekEnd = dayjs(weekKey).add(6, 'day').format('YYYY-MM-DD');
        return queryClient
          .fetchQuery({
            queryKey: ['schedule-range', uid, weekKey, weekEnd],
            queryFn: () => fetchScheduleByRange(uid, weekKey, weekEnd),
            staleTime: 0,
          })
          .then((result) => {
            fetchedRangesRef.current.add(weekKey);
            return result;
          });
      })
    ).then((results) => {
      const allItems: any[] = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.data?.length) {
          allItems.push(...result.value.data);
        }
      });
      // Replace all extra items with fresh data
      setExtraScheduleItems(allItems);
    });
  }, [queryClient]);

  const handleCalendarDateChanged = useCallback((date: string) => {
    if (dateChangedTimerRef.current) clearTimeout(dateChangedTimerRef.current);
    dateChangedTimerRef.current = setTimeout(() => {
      setVisibleDate(dayjs(date).format('YYYY-MM-DD'));
    }, 300);
  }, []);

  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('dashboard_view_mode');
        if (savedMode === 'calendar' || savedMode === 'list') {
          setViewMode(savedMode);
        }
      } catch (error) {
        console.warn('Failed to load dashboard view mode', error);
      } finally {
        setIsLoadingViewMode(false);
      }
    };

    loadViewMode();
  }, []);

  useEffect(() => {
    if (!isFocused) return;

    const loadViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('dashboard_view_mode');
        if (savedMode === 'calendar' || savedMode === 'list') {
          setViewMode(savedMode);
        }
      } catch (error) {
        console.warn('Failed to load dashboard view mode', error);
      } finally {
        setIsLoadingViewMode(false);
      }
    };

    loadViewMode();

    // Refetch schedule data when returning from booking/cancel screens
    if (userId) {
      refetch();
      refreshExtraRanges(userId);
    }
  }, [isFocused]);

  const { data: response, refetch, isFetched: hasScheduleRangeFetched } = useQuery({
    queryKey: ['schedule-range', userId, startDate, endDate],
    queryFn: () => fetchScheduleByRange(userId!, startDate, endDate),
    enabled: !!userId,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchInterval: realtimeError ? 30000 : false,
  });

  const weeksToFetch = useMemo(() => {
    const weeks: string[] = [];
    let cursor = dayjs(visibleRangeStart).startOf('week');
    const end = dayjs(visibleRangeEnd);

    while (cursor.isBefore(end)) {
      const weekKey = cursor.format('YYYY-MM-DD');
      if (!fetchedRangesRef.current.has(weekKey)) {
        weeks.push(weekKey);
      }
      cursor = cursor.add(7, 'day');
    }

    return weeks;
  }, [visibleRangeEnd, visibleRangeStart]);

  useEffect(() => {
    if (!response?.data) return;

    let cursor = dayjs(startDate).startOf('week');
    const end = dayjs(endDate);

    while (cursor.isBefore(end)) {
      fetchedRangesRef.current.add(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(7, 'day');
    }
  }, [endDate, response?.data, startDate]);

  const fetchAndMergeWeeks = useCallback(async (weeks: string[], uid: string) => {
    const unfetched = weeks.filter((w) => !fetchedRangesRef.current.has(w));
    if (unfetched.length === 0) return;

    // Mark as fetched immediately to avoid duplicate requests
    unfetched.forEach((w) => fetchedRangesRef.current.add(w));

    const results = await Promise.allSettled(
      unfetched.map((weekKey) => {
        const weekEnd = dayjs(weekKey).add(6, 'day').format('YYYY-MM-DD');
        return queryClient.fetchQuery({
          queryKey: ['schedule-range', uid, weekKey, weekEnd],
          queryFn: () => fetchScheduleByRange(uid, weekKey, weekEnd),
          staleTime: Infinity,
        });
      })
    );

    const allNewItems: any[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.data?.length) {
        allNewItems.push(...result.value.data);
      }
    });

    if (allNewItems.length > 0) {
      setExtraScheduleItems((prev) => {
        const existingKeys = new Set(
          prev.map((item: any) => `${item.type}-${item.data?.id}-${item.date}`)
        );
        const newItems = allNewItems.filter(
          (item: any) => !existingKeys.has(`${item.type}-${item.data?.id}-${item.date}`)
        );
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
  }, [queryClient]);

  useEffect(() => {
    if (!userId || weeksToFetch.length === 0) return;
    fetchAndMergeWeeks(weeksToFetch, userId);
  }, [fetchAndMergeWeeks, userId, weeksToFetch]);

  useEffect(() => {
    if (!userId || !response?.data) return;

    // Debounce adjacent weeks prefetch to avoid firing 4 parallel requests on every scroll
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      const adjacentWeeks: string[] = [];
      for (let i = 1; i <= 2; i++) {
        adjacentWeeks.push(
          dayjs(visibleRangeStart).subtract(i * 7, 'day').startOf('week').format('YYYY-MM-DD')
        );
      }
      for (let i = 1; i <= 2; i++) {
        adjacentWeeks.push(
          dayjs(visibleRangeEnd).add(i * 7, 'day').startOf('week').format('YYYY-MM-DD')
        );
      }

      fetchAndMergeWeeks(adjacentWeeks, userId);
    }, 500);

    return () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    };
  }, [fetchAndMergeWeeks, response?.data, userId, visibleRangeEnd, visibleRangeStart]);

  const scheduleItems = useMemo(() => {
    const current = response?.data || [];
    if (extraScheduleItems.length === 0) return current;

    const seenKeys = new Set(
      current.map((item: any) => `${item.type}-${item.data?.id}-${item.date}`)
    );
    const merged = [...current];

    for (const item of extraScheduleItems) {
      const key = `${item.type}-${item.data?.id}-${item.date}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(item);
      }
    }

    return merged;
  }, [extraScheduleItems, response?.data]);

  const { data: scheduleModeResponse, isFetched: hasScheduleModeFetched } = useQuery({
    queryKey: ['crew-schedule-mode', userId],
    queryFn: () => fetchCrewScheduleMode(userId!),
    enabled: !!userId,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const scheduleMode = scheduleModeResponse?.data ?? 'static';

  const { data: weeklyScheduleResponse, isFetched: hasWeeklyScheduleFetched } = useQuery({
    queryKey: ['crew-schedule', userId],
    queryFn: () => fetchCrewSchedule(userId!),
    enabled: !!userId && scheduleMode === 'static',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const dateScheduleStart = visibleRangeStart < startDate ? visibleRangeStart : startDate;
  const dateScheduleEnd = visibleRangeEnd > endDate ? visibleRangeEnd : endDate;

  const { data: dateScheduleResponse, isFetched: hasDateScheduleFetched } = useQuery({
    queryKey: ['crew-date-schedule', userId, dateScheduleStart, dateScheduleEnd],
    queryFn: () => fetchCrewDateSchedules(userId!, dateScheduleStart, dateScheduleEnd),
    enabled: !!userId,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const { data: appointmentTypesResponse } = useQuery({
    queryKey: ['appointmentTypes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchAppointmentTypesByCrewMember(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  const minAppointmentTypeDuration = useMemo(() => {
    const durations = (appointmentTypesResponse || [])
      .map((type) => Number(type?.duration_minutes))
      .filter((value) => Number.isFinite(value) && value > 0) as number[];

    if (durations.length === 0) return undefined;

    return Math.min(...durations);
  }, [appointmentTypesResponse]);

  useEffect(() => {
    if (!userId) return;

    // Debounced invalidation to prevent cascade re-renders from rapid-fire events
    const debouncedInvalidateSchedule = () => {
      if (realtimeInvalidationTimerRef.current) {
        clearTimeout(realtimeInvalidationTimerRef.current);
      }
      realtimeInvalidationTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['appointments', userId],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ['schedule-range', userId],
          exact: false,
        });
        refetch();
        refreshExtraRanges(userId);
      }, 300);
    };

    const channelName = `dashboard_realtime_${userId}`;
    // Remove existing channel if present
    const existingChannel = supabase.realtime.channels.find(
      (channel) => channel.topic === `realtime:${channelName}`
    );
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName)
      // DB: appointments changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            debouncedInvalidateSchedule();
            return;
          }

          const crewMemberId = payload.new?.crew_member_id;
          if (crewMemberId !== userId) return;
          debouncedInvalidateSchedule();
        }
      )
      // DB: break_dates changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'break_dates',
        },
        (payload) => {
          const crewMemberId = payload.new?.crew_member_id || payload.old?.crew_member_id;
          if (crewMemberId !== userId) return;
          debouncedInvalidateSchedule();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('🟡 [Dashboard] DB subscription issue:', status);
          setRealtimeError(true);
        }
      });

    const scheduleChannel = supabase
      .channel('schedule-updates')
      .on('broadcast', { event: 'schedule_updated' }, (payload) => {
        const { crew_member_id } = payload.payload || {};
        if (crew_member_id !== userId) return;

        queryClient.invalidateQueries({
          queryKey: ['crew-schedule-mode', userId],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ['crew-schedule', userId],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ['crew-date-schedule', userId],
          exact: false,
        });
        debouncedInvalidateSchedule();
        toast.info('לוח הזמנים עודכן');
      })
      .subscribe();

    const broadcastChannelName = `crew-appointments-${userId}`;
    // Remove existing broadcast channel if present
    const existingBroadcastChannel = supabase.realtime.channels.find(
      (channel) => channel.topic === `realtime:${broadcastChannelName}`
    );
    if (existingBroadcastChannel) {
      supabase.removeChannel(existingBroadcastChannel);
    }

    const broadcastChannel = supabase
      .channel(broadcastChannelName)
      .on('broadcast', { event: 'appointment_booked' }, () => {
        debouncedInvalidateSchedule();
      })
      .on('broadcast', { event: 'appointment_cancelled' }, () => {
        debouncedInvalidateSchedule();
      })
      .subscribe();

    return () => {
      if (realtimeInvalidationTimerRef.current) {
        clearTimeout(realtimeInvalidationTimerRef.current);
      }
      channel.unsubscribe();
      scheduleChannel.unsubscribe();
      broadcastChannel.unsubscribe();
    };
  }, [endDate, queryClient, refetch, refreshExtraRanges, startDate, userId]);

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      scheduleItems.map((item) => {
        if (item.type === 'appointment') {
          const title = item.data.customer?.full_name || item.data.appointment_type?.name || 'תור';
          return {
            id: `appointment-${item.data.id}-${item.date}`,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            type: 'appointment' as const,
            title,
            appointmentId: item.data.id,
            appointmentTypeName: item.data.appointment_type?.name || undefined,
            appointmentTypeColor: item.data.appointment_type?.color || undefined,
            appointmentStatus: item.data.status || undefined,
            cancellationReason: item.data.cancellation_reason || undefined,
            customerName: item.data.customer?.full_name || undefined,
            customerPhone: item.data.customer?.phone || undefined,
            customerId: item.data.customer?.id || undefined,
            paymentType: item.data.payment_type || undefined,
          };
        }

        const title = item.data.reason ? `הפסקה: ${item.data.reason}` : 'הפסקה';
        return {
          id: `break-${item.data.id}-${item.date}`,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          type: 'break' as const,
          title,
          breakId: item.data.id,
          breakReason: item.data.reason || undefined,
          breakCrewMemberId: item.data.crew_member_id,
        };
      }),
    [scheduleItems]
  );

  const leftHeaderComponent = useMemo(() => {
    if (!showCrewPicker) {
      return null;
    }

    const initials =
      ownerName
        ?.split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('') || 'י';

    return (
      <View className="flex-1 items-center justify-center ">
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(crew)/(tabs)/dashboard/crew-switcher',
              params: { crewMemberId: userId },
            });
          }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}
          className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
          {ownerAvatarUrl ? (
            <Image
              source={{ uri: ownerAvatarUrl }}
              contentFit="cover"
              style={{ width: '100%', height: '100%', borderRadius: 18 }}
            />
          ) : (
            <Text className="text-xs font-semibold text-slate-700">{initials}</Text>
          )}
        </Pressable>
      </View>
    );
  }, [ownerAvatarUrl, ownerName, showCrewPicker, userId]);

  const isCalendarReadyForSplash =
    !!userId &&
    !isLoadingViewMode &&
    viewMode === 'calendar' &&
    hasScheduleRangeFetched &&
    hasScheduleModeFetched &&
    hasDateScheduleFetched &&
    (scheduleMode !== 'static' || hasWeeklyScheduleFetched);

  useEffect(() => {
    if (dashboardReady) return;
    if (!userId || isLoadingViewMode) return;
    if (viewMode === 'calendar' && !isCalendarReadyForSplash) return;

    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    const timeout = setTimeout(() => {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setDashboardReady(true);
        });
      });
    }, 80);

    return () => {
      clearTimeout(timeout);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [
    dashboardReady,
    isCalendarReadyForSplash,
    isLoadingViewMode,
    setDashboardReady,
    userId,
    viewMode,
  ]);

  return (
    <View className="flex-1">
      {isLoadingViewMode || viewMode === 'calendar' ? (
        <GoogleCalendar
          events={calendarEvents}
          leftHeaderComponent={leftHeaderComponent}
          scheduleMode={scheduleMode}
          weeklySchedule={weeklyScheduleResponse?.data ?? undefined}
          dateSchedules={dateScheduleResponse?.data ?? undefined}
          crewMemberId={userId}
          canEditSchedule={canEditSchedule}
          isAdmin={user?.role === 'admin'}
          minAppointmentTypeDuration={minAppointmentTypeDuration}
          onDateChanged={handleCalendarDateChanged}
        />
      ) : (
        <DashboardAppointmentsPager userId={userId} />
      )}
    </View>
  );
}

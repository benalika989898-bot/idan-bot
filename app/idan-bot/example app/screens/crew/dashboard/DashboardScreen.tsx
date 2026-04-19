import { useAuth } from '@/contexts/AuthContext';
import { useFab } from '@/contexts/FabContext';
import { getCrewNotificationsCount } from '@/services/crew/notifications';
import { fetchWaitingListCount } from '@/services/crew/waitingList';
import { useCrewCalendarStore } from '@/stores/crewCalendarStore';
import { getCurrentIsraelDateString } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CrewFab from './components/CrewFab';
import DashboardAppointmentsList from './components/DashboardAppointmentsList';

export default function DashboardScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { setIsModalOpen } = useFab();
  const {
    crewMemberId: crewMemberIdParam,
    crewMemberAvatarUrl: crewMemberAvatarUrlParam,
    crewMemberName: crewMemberNameParam,
  } = useLocalSearchParams<{
    crewMemberId?: string | string[];
    crewMemberAvatarUrl?: string | string[];
    crewMemberName?: string | string[];
  }>();
  const crewMemberId = Array.isArray(crewMemberIdParam) ? crewMemberIdParam[0] : crewMemberIdParam;
  const crewMemberAvatarUrl = Array.isArray(crewMemberAvatarUrlParam)
    ? crewMemberAvatarUrlParam[0]
    : crewMemberAvatarUrlParam;
  const crewMemberName = Array.isArray(crewMemberNameParam)
    ? crewMemberNameParam[0]
    : crewMemberNameParam;
  const {
    selectedCrewMemberId: storedCrewMemberId,
    selectedCrewMemberName: storedCrewMemberName,
    selectedCrewMemberAvatarUrl: storedCrewMemberAvatarUrl,
    setSelectedCrew,
    clearSelectedCrew,
  } = useCrewCalendarStore();

  useEffect(() => {
    if (user?.role !== 'admin') {
      clearSelectedCrew();
    }
  }, [clearSelectedCrew, user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin' || !crewMemberId) return;
    if (crewMemberId === storedCrewMemberId) return;
    setSelectedCrew({
      id: crewMemberId,
      name: crewMemberName || undefined,
      avatarUrl: crewMemberAvatarUrl || undefined,
    });
  }, [
    crewMemberAvatarUrl,
    crewMemberId,
    crewMemberName,
    setSelectedCrew,
    storedCrewMemberId,
    user?.role,
  ]);

  const effectiveCrewMemberId =
    user?.role === 'admin' ? storedCrewMemberId || crewMemberId || user?.id : user?.id;
  const selectedCrewAvatarUrl =
    effectiveCrewMemberId === user?.id
      ? user?.avatar_url || undefined
      : storedCrewMemberAvatarUrl || crewMemberAvatarUrl;
  const selectedCrewName =
    effectiveCrewMemberId === user?.id
      ? user?.full_name || undefined
      : storedCrewMemberName || crewMemberName;
  const isViewingOtherCrew =
    user?.role === 'admin' &&
    !!effectiveCrewMemberId &&
    !!user?.id &&
    effectiveCrewMemberId !== user.id;

  const isAdmin = user?.role === 'admin';
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const lastSeenIso = lastSeenAt ? new Date(lastSeenAt).toISOString() : undefined;
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['crew-notifications-count', user?.id, !!isAdmin, lastSeenIso],
    queryFn: async () => {
      if (!user?.id) return 0;
      return await getCrewNotificationsCount({
        userId: user.id,
        isAdmin: !!isAdmin,
        since: lastSeenIso,
      });
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const loadLastSeen = async () => {
      if (!user?.id) {
        setLastSeenAt(null);
        return;
      }
      const stored = await AsyncStorage.getItem(`crew_notifications_last_seen_${user.id}`);
      setLastSeenAt(stored ? Number(stored) : null);
    };

    loadLastSeen();
  }, [user?.id]);

  useEffect(() => {
    if (!isFocused) return;

    const loadLastSeen = async () => {
      if (!user?.id) {
        setLastSeenAt(null);
        return;
      }
      const stored = await AsyncStorage.getItem(`crew_notifications_last_seen_${user.id}`);
      setLastSeenAt(stored ? Number(stored) : null);
    };

    loadLastSeen();
  }, [isFocused, user?.id]);

  const todayDate = getCurrentIsraelDateString();
  const weekStartDate = dayjs(todayDate).startOf('week').format('YYYY-MM-DD');
  const endDate = dayjs(todayDate).add(9, 'day').format('YYYY-MM-DD');
  const waitingListEndDate = dayjs(todayDate).add(6, 'day').format('YYYY-MM-DD');

  const { data: waitingListCountData } = useQuery({
    queryKey: ['waiting-list-count', effectiveCrewMemberId, todayDate, waitingListEndDate],
    queryFn: async () => {
      if (!effectiveCrewMemberId) return 0;
      const { count } = await fetchWaitingListCount({
        crewMemberId: effectiveCrewMemberId,
        startDate: todayDate,
        endDate: waitingListEndDate,
      });
      return count;
    },
    enabled: !!effectiveCrewMemberId,
  });

  const waitingListCount = waitingListCountData || 0;
  const hasSecondaryActionColumn = waitingListCount > 0 || isViewingOtherCrew;

  return (
    <View className="flex-1" style={{ direction: 'rtl' }}>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <DashboardAppointmentsList
          startDate={weekStartDate}
          endDate={endDate}
          userId={effectiveCrewMemberId}
          showCrewPicker={user?.role === 'admin'}
          ownerAvatarUrl={selectedCrewAvatarUrl}
          ownerName={selectedCrewName}
          canEditSchedule={user?.role === 'admin' || user?.role === 'crew'}
        />
      </View>
      <View style={{ bottom: insets.bottom * 1.1 }} className="absolute left-6 right-6 z-50">
        <Animated.View
          layout={LinearTransition}
          className={`flex-row-reverse items-center ${isViewingOtherCrew ? '' : 'justify-between'}`}>
          {/* Break Hours Button */}
          <Pressable
            onPress={() => {
              router.push({
                pathname: '/(crew)/add-break-hours',
                params: { selectedDate: todayDate },
              });
            }}
            className="h-16 w-16 items-center justify-center rounded-full bg-indigo-700 shadow-sm transition-all duration-200 active:scale-95 active:opacity-50">
            <MaterialCommunityIcons name="clock-plus" size={24} color="white" />
          </Pressable>

          {hasSecondaryActionColumn && (
            <View className="mx-3 flex-1 gap-2">
              {waitingListCount > 0 && (
                <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/(crew)/(tabs)/dashboard/waiting-list',
                        params: { crewMemberId: effectiveCrewMemberId },
                      })
                    }
                    className="items-center justify-center rounded-full bg-white px-4 py-2.5 shadow-sm transition-all duration-200 active:scale-95 active:opacity-50">
                    <Text className="text-sm font-semibold text-gray-900">
                      {waitingListCount} לקוחות ברשימת המתנה
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {isViewingOtherCrew && (
                <Animated.View entering={FadeInUp} exiting={FadeOutDown}>
                  <Pressable
                    onPress={() => {
                      clearSelectedCrew();
                      router.setParams({
                        crewMemberId: undefined,
                        crewMemberAvatarUrl: undefined,
                        crewMemberName: undefined,
                      });
                    }}
                    className="items-center justify-center rounded-full bg-black px-4 py-2.5"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <Text className="text-sm font-semibold text-white">חזרה ללוח הזמנים שלך</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          )}

          {/* Main FAB */}
          <Link href="(modal)/actions" asChild>
            <CrewFab icon="add" onPress={() => setIsModalOpen(true)} />
          </Link>
        </Animated.View>

        {/* Notifications Button - positioned above the FAB row */}
        {!isViewingOtherCrew && (
          <View className="absolute -top-20 left-0">
            <Pressable
              onPress={() => router.push('/(crew)/notifications')}
              className="relative h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-200 active:scale-95 active:opacity-50">
              <Ionicons name="notifications-outline" size={24} color="#111827" />
              {unreadCount > 0 && (
                <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="text-xs font-semibold text-white">{unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

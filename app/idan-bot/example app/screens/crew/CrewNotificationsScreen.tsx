import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { getSwapRequestsForCrew } from '@/services/appointmentSwaps';
import { fetchCrewMembersList } from '@/services/crew/analytics';
import { getCrewNotifications } from '@/services/crew/notifications';
import { ChipGroup } from '@/shared/ui/molecules/animated-chip/Chip';
import { formatRelativeTime } from '@/utils/relativeTime';

type MergedItem =
  | { kind: 'notification'; created_at: string; data: any }
  | { kind: 'swap_request'; created_at: string; data: any };

function SwapRequestItem({
  swap,
  formatDate,
  formatTime,
}: {
  swap: any;
  formatDate: (date: string, short?: boolean) => string;
  formatTime: (start: string, end: string) => string;
}) {
  const requesterName = swap.requester_appointment.customer?.full_name || 'לקוח';
  const recipientName = swap.recipient_appointment.customer?.full_name || 'לקוח';
  const requesterDate = formatDate(swap.requester_appointment.appointment_date, true);
  const recipientDate = formatDate(swap.recipient_appointment.appointment_date, true);
  const requesterTime = formatTime(
    swap.requester_appointment.start_time,
    swap.requester_appointment.end_time
  );
  const recipientTime = formatTime(
    swap.recipient_appointment.start_time,
    swap.recipient_appointment.end_time
  );
  const serviceName =
    swap.requester_appointment.appointment_type?.name ||
    swap.recipient_appointment.appointment_type?.name ||
    'תור';
  const relativeTime = formatRelativeTime(swap.created_at);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(modal)/swap-request',
          params: { requestId: swap.id },
        })
      }
      className="border-b border-gray-100 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
          <Ionicons name="swap-vertical" size={18} color="#B45309" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-left text-base font-semibold text-gray-900">
            בקשת החלפה חדשה
          </Text>
          <Text className="text-left text-sm text-gray-500">שירות: {serviceName}</Text>
          <View className="gap-1">
            <Text className="text-left text-sm text-gray-600">
              {requesterName}: {requesterDate} • {requesterTime}
            </Text>
            <Text className="text-left text-sm text-gray-600">
              {recipientName}: {recipientDate} • {recipientTime}
            </Text>
          </View>
          <Text className="text-left text-xs text-amber-600">ממתין לאישור • {relativeTime}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function NotificationItem({
  notification,
  formatDate,
}: {
  notification: any;
  formatDate: (date: string, short?: boolean) => string;
}) {
  const isCancellation = notification.type === 'booking_cancelled';
  const isSwap = notification.type === 'swap_accepted';

  const title = isSwap
    ? notification.requester_customer_name && notification.recipient_customer_name
      ? `${notification.requester_customer_name} החליף/ה עם ${notification.recipient_customer_name}`
      : 'החלפת תור בוצעה'
    : isCancellation
      ? `${notification.customer_name || 'לקוח'} ביטל/ה תור`
      : `${notification.customer_name || 'לקוח'} קבע/ה תור`;

  const timeText = notification.start_time ? notification.start_time.slice(0, 5) : '';
  const otherTimeText = notification.other_start_time
    ? notification.other_start_time.slice(0, 5)
    : '';
  const baseLine = `שירות: ${notification.appointment_type_name} • ${formatDate(
    notification.appointment_date,
    true
  )}`;
  const showSwapTimes = isSwap && timeText && otherTimeText;
  const standardLine = timeText ? `${baseLine} • ${timeText}` : baseLine;
  const relativeTime = formatRelativeTime(notification.created_at);
  const statusColor = isSwap
    ? 'text-indigo-600'
    : isCancellation
      ? 'text-rose-600'
      : 'text-emerald-600';
  const avatarUrl =
    notification.customer_avatar_url ||
    notification.requester_customer_avatar_url ||
    notification.crew_member_avatar_url ||
    undefined;

  return (
    <View className="border-b border-gray-100 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 40, height: 40, borderRadius: 999 }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <Ionicons name="person" size={18} color="#111827" />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-left text-base font-semibold text-gray-900">{title}</Text>
          {showSwapTimes ? (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="w-20 text-left text-xs text-gray-500">
                  {notification.requester_customer_name || 'לקוח'}
                </Text>
                <Text className="text-left text-sm font-semibold text-gray-400 line-through">
                  {timeText}
                </Text>
                <Ionicons name="swap-horizontal" size={14} color="#6B7280" />
                <Text className="text-left text-sm font-semibold text-gray-700">
                  {otherTimeText}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="w-20 text-left text-xs text-gray-500">
                  {notification.recipient_customer_name || 'לקוח'}
                </Text>
                <Text className="text-left text-sm font-semibold text-gray-400 line-through">
                  {otherTimeText}
                </Text>
                <Ionicons name="swap-horizontal" size={14} color="#6B7280" />
                <Text className="text-left text-sm font-semibold text-gray-700">
                  {timeText}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-left text-sm text-gray-500">{standardLine}</Text>
          )}
          {isSwap ? (
            <Text className="text-left text-sm text-gray-500">{baseLine}</Text>
          ) : null}
          <Text className={`text-left text-xs ${statusColor}`}>{relativeTime}</Text>
        </View>
      </View>
    </View>
  );
}

const NotificationsList = ({
  crewMemberId,
  emptyText,
  bottomPadding = 24,
  isActive = true,
}: {
  crewMemberId: string;
  emptyText?: string;
  bottomPadding?: number;
  isActive?: boolean;
}) => {
  const { formatDate, formatTime } = useDateFormat();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['crew-notifications', crewMemberId],
    queryFn: async () => {
      return await getCrewNotifications({ userId: crewMemberId, isAdmin: false });
    },
    enabled: !!crewMemberId && isActive,
    staleTime: 2 * 60 * 1000,
  });
  const {
    data: swapRequests = [],
    isLoading: swapsLoading,
    refetch: refetchSwapRequests,
  } = useQuery({
    queryKey: ['crew-swap-requests', crewMemberId],
    queryFn: async () => {
      const { data, error } = await getSwapRequestsForCrew({ crewMemberId, isAdmin: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!crewMemberId && isActive,
    staleTime: 2 * 60 * 1000,
  });

  const mergedNotifications: MergedItem[] = [
    ...notifications.map((item) => ({
      kind: 'notification' as const,
      created_at: item.created_at,
      data: item,
    })),
    ...swapRequests.map((item) => ({
      kind: 'swap_request' as const,
      created_at: item.created_at,
      data: item,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isLoading = notificationsLoading || swapsLoading;

  const handleRefresh = () => {
    setIsManualRefreshing(true);
    void Promise.all([refetchNotifications(), refetchSwapRequests()]).finally(() => {
      setIsManualRefreshing(false);
    });
  };

  const renderItem = ({ item }: { item: MergedItem }) => {
    if (item.kind === 'swap_request') {
      return (
        <SwapRequestItem swap={item.data} formatDate={formatDate} formatTime={formatTime} />
      );
    }
    return <NotificationItem notification={item.data} formatDate={formatDate} />;
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <FlashList
      data={mergedNotifications}
      estimatedItemSize={72}
      keyExtractor={(item) => `${item.kind}-${item.data.id}`}
      contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={isManualRefreshing}
          onRefresh={handleRefresh}
          tintColor="#000"
        />
      }
      renderItem={renderItem}
      ListEmptyComponent={
        <View className="items-center py-10">
          <Text className="text-center text-base text-gray-500">{emptyText || 'אין התראות'}</Text>
        </View>
      }
    />
  );
};

const CrewNotificationsScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const [currentCrewPageIndex, setCurrentCrewPageIndex] = useState(0);
  const crewPagerRef = useRef<PagerView>(null);

  const { data: crewMembers, isLoading: crewMembersLoading } = useQuery({
    queryKey: ['crewMembersList'],
    queryFn: fetchCrewMembersList,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const members = (() => {
    if (!isAdmin || !user?.id) return [];

    const crewList = (crewMembers?.data || []).map((member) => ({
      id: member.id,
      displayName: member.name,
      avatar_url: member.avatar_url,
    }));
    const currentAdmin = crewList.find((member) => member.id === user.id) || {
      id: user.id,
      displayName: user.full_name || 'מנהל',
      avatar_url: user.avatar_url,
    };

    return [currentAdmin, ...crewList.filter((member) => member.id !== user.id)];
  })();

  const adminChips = members.map((member) => ({
    label: member.displayName,
    activeColor: '#111827',
    labelColor: '#ffffff',
    inActiveBackgroundColor: '#f3f4f6',
    icon: () =>
      member.avatar_url ? (
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Image
            source={{ uri: member.avatar_url }}
            style={{ width: 32, height: 32, borderRadius: 999 }}
            transition={200}
            contentFit="cover"
          />
        </View>
      ) : (
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="person" size={18} color="#111827" />
        </View>
      ),
  }));

  const hasMultipleCrew = members.length > 1;

  const handleCrewMemberPress = (index: number) => {
    setCurrentCrewPageIndex(index);
    crewPagerRef.current?.setPage(index);
  };

  // useCallback is required by useFocusEffect API
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      AsyncStorage.setItem(`crew_notifications_last_seen_${user.id}`, Date.now().toString());
    }, [user?.id])
  );

  if (!user?.id) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">יש להתחבר כדי לצפות בהתראות</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ direction: 'rtl', paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </Pressable>
        <Text className="text-center text-lg font-semibold text-black">התראות</Text>
        <View className="h-10 w-10" />
      </View>

      {isAdmin ? (
        crewMembersLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : members.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-base text-gray-500">אין אנשי צוות להצגה</Text>
          </View>
        ) : (
          <View className="flex-1">
            <PagerView
              ref={crewPagerRef}
              style={{ flex: 1 }}
              initialPage={0}
              layoutDirection={'rtl'}
              onPageSelected={(event) => setCurrentCrewPageIndex(event.nativeEvent.position)}
              orientation="horizontal">
              {members.map((member, index) => (
                <View key={member.id} className="flex-1" collapsable={false}>
                  <NotificationsList
                    crewMemberId={member.id}
                    bottomPadding={hasMultipleCrew ? 96 : 24}
                    isActive={Math.abs(index - currentCrewPageIndex) <= 1}
                  />
                </View>
              ))}
            </PagerView>
          </View>
        )
      ) : (
        <View className="flex-1">
          <NotificationsList crewMemberId={user.id} />
        </View>
      )}
      {isAdmin && hasMultipleCrew ? (
        <View
          pointerEvents="box-none"
          style={{ bottom: Math.max(insets.bottom, 12) }}
          className="absolute left-0 right-0 items-center px-4">
          <View className="max-w-full rounded-full bg-white/95 px-3 py-2 shadow-sm">
            <ChipGroup
              chips={adminChips}
              selectedIndex={currentCrewPageIndex}
              onChange={handleCrewMemberPress}
              containerStyle={{ flexDirection: 'row-reverse' }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default CrewNotificationsScreen;

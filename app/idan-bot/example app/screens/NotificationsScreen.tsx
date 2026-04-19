import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { getSwapRequestsForUser, SwapRequestListItem } from '@/services/appointmentSwaps';
import {
  fetchAllNotifications,
  CustomerMessage,
  CancellationNotification,
} from '@/services/notifications';
import { formatRelativeTime } from '@/utils/relativeTime';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NotificationItem =
  | { type: 'swap'; data: SwapRequestListItem; created_at: string }
  | { type: 'message'; data: CustomerMessage; created_at: string }
  | { type: 'cancellation'; data: CancellationNotification; created_at: string };

const NotificationsScreen = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const insets = useSafeAreaInsets();

  const {
    data: requests = [],
    isLoading: isLoadingSwaps,
    isRefetching: isRefetchingSwaps,
    refetch: refetchSwaps,
  } = useQuery({
    queryKey: ['swap-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await getSwapRequestsForUser(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const {
    data: extraNotifications,
    isLoading: isLoadingExtra,
    isRefetching: isRefetchingExtra,
    refetch: refetchExtra,
  } = useQuery({
    queryKey: ['extra-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { messages: [], cancellations: [] };
      return await fetchAllNotifications(user.id);
    },
    enabled: !!user?.id,
  });

  const messages = extraNotifications?.messages ?? [];
  const cancellations = extraNotifications?.cancellations ?? [];

  const isLoading = isLoadingSwaps || isLoadingExtra;
  const isRefetching = isRefetchingSwaps || isRefetchingExtra;

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [
      ...requests.map((r): NotificationItem => ({ type: 'swap', data: r, created_at: r.created_at })),
      ...messages.map((m): NotificationItem => ({ type: 'message', data: m, created_at: m.created_at })),
      ...cancellations.map((c): NotificationItem => ({ type: 'cancellation', data: c, created_at: c.created_at })),
    ];
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [requests, messages, cancellations]);

  const refetchAll = useCallback(() => {
    refetchSwaps();
    refetchExtra();
  }, [refetchSwaps, refetchExtra]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      AsyncStorage.setItem(`swap_notifications_last_seen_${user.id}`, Date.now().toString());
    }, [user?.id])
  );

  if (!user?.id) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">יש להתחבר כדי לצפות בהתראות</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: NotificationItem }) => {
    if (item.type === 'swap') {
      const swap = item.data;
      const isRecipient = swap.recipient_id === user.id;
      const statusText =
        swap.status === 'pending'
          ? 'ממתינה לאישור'
          : swap.status === 'accepted'
            ? 'אושרה'
            : 'נדחתה';
      const title = isRecipient ? 'בקשת החלפה נכנסה' : 'בקשת החלפה ששלחת';
      const relativeTime = formatRelativeTime(swap.created_at);
      const statusColor =
        swap.status === 'accepted'
          ? 'text-emerald-600'
          : swap.status === 'declined'
            ? 'text-rose-600'
            : 'text-amber-600';

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
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons name="swap-vertical" size={18} color="#111827" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-left text-base font-semibold text-gray-900">{title}</Text>
              <Text className={`text-left text-xs ${statusColor}`}>
                סטטוס: {statusText} • {relativeTime}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    }

    if (item.type === 'message') {
      const msg = item.data;
      const relativeTime = formatRelativeTime(msg.created_at);
      const senderName = msg.crew_member?.full_name ?? '';

      return (
        <View className="border-b border-gray-100 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Ionicons name="chatbubble-ellipses" size={18} color="#7c3aed" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-left text-base font-semibold text-gray-900">
                {msg.title || 'הודעה'}
              </Text>
              {msg.content ? (
                <Text className="text-left text-sm text-gray-600" numberOfLines={2}>
                  {msg.content}
                </Text>
              ) : null}
              <Text className="text-left text-xs text-gray-400">
                {senderName ? `${senderName} • ` : ''}{relativeTime}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'cancellation') {
      const cancel = item.data;
      const relativeTime = formatRelativeTime(cancel.created_at);
      const dateStr = cancel.appointment_date
        ? formatDate(cancel.appointment_date)
        : '';
      const timeStr = cancel.start_time
        ? cancel.start_time.slice(0, 5)
        : '';

      return (
        <View className="border-b border-gray-100 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Ionicons name="close-circle" size={18} color="#dc2626" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-left text-base font-semibold text-gray-900">
                התור שלך בוטל
              </Text>
              <Text className="text-left text-sm text-gray-600">
                {cancel.appointment_type_name}
                {dateStr ? ` • ${dateStr}` : ''}
                {timeStr ? ` • ${timeStr}` : ''}
              </Text>
              {cancel.cancellation_reason ? (
                <Text className="text-left text-xs text-gray-500">
                  סיבה: {cancel.cancellation_reason}
                </Text>
              ) : null}
              <Text className="text-left text-xs text-gray-400">{relativeTime}</Text>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View className="flex-1 bg-white" style={{ direction: 'rtl', paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">התראות</Text>
        <View className="h-10 w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlashList
          data={notifications}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchAll}
              tintColor="#000"
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className="text-center text-base text-gray-500">אין התראות</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

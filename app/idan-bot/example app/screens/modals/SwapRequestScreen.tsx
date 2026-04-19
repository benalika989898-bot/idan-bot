import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import dayjs from 'dayjs';

import {
  fetchSwapRequestDetails,
  acceptSwapRequest,
  declineSwapRequest,
  sendSwapNotification,
} from '@/services/appointmentSwaps';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SwapRequestScreen = () => {
  const { requestId: requestIdParam } = useLocalSearchParams<{
    requestId?: string | string[];
  }>();
  const requestId = Array.isArray(requestIdParam) ? requestIdParam[0] : requestIdParam;
  const { formatDate, formatTime } = useDateFormat();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { data: request, isLoading } = useQuery({
    queryKey: ['swap-request', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const { data, error } = await fetchSwapRequestDetails(requestId);
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) return;
      const { error } = await acceptSwapRequest(requestId);
      if (error) throw error;

      const { error: notificationError } = await sendSwapNotification({
        requestId,
        type: 'response',
        status: 'accepted',
      });
      if (notificationError) throw notificationError;
    },
    onSuccess: () => {
      toast.success('החלפת התור בוצעה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments', user?.id] });
      router.back();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'לא ניתן לבצע החלפה');
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) return;
      const { error } = await declineSwapRequest(requestId);
      if (error) throw error;

      const { error: notificationError } = await sendSwapNotification({
        requestId,
        type: 'response',
        status: 'declined',
      });
      if (notificationError) throw notificationError;
    },
    onSuccess: () => {
      toast.success('הבקשה נדחתה');
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      router.back();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'לא ניתן לדחות בקשה');
    },
  });

  if (!requestId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">לא נמצאה בקשה</Text>
      </View>
    );
  }

  if (isLoading || !request) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const isRecipient = user?.id === request.recipient_id;
  const isPending = request.status === 'pending';
  const recipientDateTime = dayjs(
    `${request.recipient_appointment.appointment_date}T${request.recipient_appointment.start_time}`
  );
  const requesterDateTime = dayjs(
    `${request.requester_appointment.appointment_date}T${request.requester_appointment.start_time}`
  );
  const isSwapExpired = recipientDateTime.isBefore(dayjs()) || requesterDateTime.isBefore(dayjs());

  return (
    <View
      className="flex-1 bg-white"
      style={{ direction: 'rtl', paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="close" size={20} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">בקשת החלפה</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1 px-6">
        <Text className="text-center text-sm text-gray-500">בקשת החלפה לתור שלך</Text>

        <View className="mt-6 rounded-2xl bg-neutral-100 px-6 py-5">
          <Text className="text-center text-sm text-gray-500">התור שלך</Text>
          <Text className="mt-2 text-center text-xl font-semibold text-gray-900">
            {request.recipient_appointment.appointment_type.name}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {formatDate(request.recipient_appointment.appointment_date, true)} •{' '}
            {formatTime(
              request.recipient_appointment.start_time,
              request.recipient_appointment.end_time
            )}
          </Text>
        </View>

        <View className="mt-4 items-center">
          <Ionicons name="swap-vertical" size={20} color="#6B7280" />
        </View>

        <View className="mt-4 rounded-2xl bg-neutral-100 px-6 py-5">
          <Text className="text-center text-sm text-gray-500">התור של הלקוח שמבקש החלפה</Text>
          <Text className="mt-2 text-center text-xl font-semibold text-gray-900">
            {request.requester_appointment.appointment_type.name}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {formatDate(request.requester_appointment.appointment_date, true)} •{' '}
            {formatTime(
              request.requester_appointment.start_time,
              request.requester_appointment.end_time
            )}
          </Text>
        </View>

        <View style={{ height: 24 }} />

        {!isRecipient && isPending && (
          <Text className="text-center text-sm text-gray-500">אין לך הרשאה לטפל בבקשה זו.</Text>
        )}

        {isRecipient && !isPending && (
          <Text className="text-center text-sm text-gray-500">הבקשה כבר טופלה.</Text>
        )}

        {!isRecipient && !isPending && (
          <Text className="text-center text-sm text-gray-500">
            {request.status === 'accepted' ? 'הבקשה אושרה.' : 'הבקשה נדחתה.'}
          </Text>
        )}

        {isRecipient && isPending && isSwapExpired && (
          <Text className="text-center text-sm text-gray-500">
            לא ניתן לבצע החלפה כי אחד התורים כבר עבר.
          </Text>
        )}

        {isRecipient && isPending && !isSwapExpired && (
          <View className="mt-auto pb-10">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => declineMutation.mutate()}
                disabled={declineMutation.isPending || acceptMutation.isPending}
                className="flex-1 items-center justify-center rounded-full border border-gray-200 py-4">
                {declineMutation.isPending ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <Text className="text-base font-semibold text-gray-700">דחה</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => acceptMutation.mutate()}
                disabled={declineMutation.isPending || acceptMutation.isPending}
                className="flex-1 items-center justify-center rounded-full bg-black py-4">
                {acceptMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">אשר החלפה</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SwapRequestScreen;

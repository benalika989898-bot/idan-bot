import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  CustomerAppointment,
  canCancelAppointment,
  cancelAppointment,
  getUpcomingCustomerAppointments,
} from '@/services/appointments';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { toast } from 'sonner-native';

const UpcomingAppointments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { formatDate, formatTime } = useDateFormat();
  const { width: screenWidth } = useWindowDimensions();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['upcomingAppointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await getUpcomingCustomerAppointments(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      toast.success('התור בוטל בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets', user?.id] }); // Invalidate ticket balance after cancellation
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] }); // Refresh available slots
    },
    onError: () => {
      toast.error('לא ניתן לבטל את התור. אנא נסה שוב.');
    },
    onSettled: () => {
      setCancellingId(null);
    },
  });

  const handleCancelAppointment = useCallback(
    (appointment: CustomerAppointment) => {
      Alert.alert('ביטול תור', 'האם אתה בטוח שברצונך לבטל את התור?', [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: () => {
            setCancellingId(appointment.id);
            cancelMutation.mutate(appointment.id);
          },
        },
      ]);
    },
    [cancelMutation]
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const pageWidth = layoutMeasurement?.width || screenWidth;
      const maxOffset = Math.max(0, contentSize.width - pageWidth);
      const rawIndex = Math.round(contentOffset.x / pageWidth);
      const index = I18nManager.isRTL
        ? Math.round((maxOffset - contentOffset.x) / pageWidth)
        : rawIndex;
      setCurrentIndex(index);
    },
    [screenWidth]
  );

  const renderAppointmentItem = useCallback(
    ({ item: appointment }: { item: CustomerAppointment }) => {
      const canCancel = canCancelAppointment(appointment.appointment_date, appointment.start_time);
      const isCancelling = cancelMutation.isPending && cancellingId === appointment.id;
      const cardWidth = screenWidth - 32;

      return (
        <View
          style={{ direction: 'rtl', width: cardWidth, marginHorizontal: 16 }}
          className="justify-center rounded-lg border border-gray-200 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3">
              <Image
                source={{
                  uri: appointment.crew_member.avatar_url || 'https://via.placeholder.com/40',
                }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
                contentFit="cover"
                className="bg-gray-200"
              />

              <View className="flex-1">
                <Text className="text-left font-semibold text-black">
                  {appointment.crew_member.full_name || 'ספק ללא שם'}
                </Text>
                <Text className="text-left text-sm text-gray-600">
                  {appointment.appointment_type.name}
                </Text>
                <Text className="text-left text-sm text-gray-500">
                  {formatDate(appointment.appointment_date, true)} •{' '}
                  {formatTime(appointment.start_time, appointment.end_time)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(modal)/swap-appointment',
                    params: {
                      appointmentId: appointment.id,
                      customerOnly: canCancel ? 'false' : 'true',
                    },
                  })
                }
                className="rounded-full border border-gray-200 bg-white p-2">
                <Ionicons name="swap-vertical" size={18} color="#111827" />
              </Pressable>
              {canCancel && (
                <Pressable
                  onPress={() => handleCancelAppointment(appointment)}
                  className="rounded-full bg-black p-2 shadow-sm"
                  disabled={isCancelling}>
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close" size={20} color="#fff" />
                  )}
                </Pressable>
              )}
            </View>
          </View>
          {!canCancel && (
            <View className="mt-3 border-t border-gray-100 pt-3">
              <Text className="text-center text-xs text-gray-400">
                ביטול תור אפשרי עד שעתיים לפני מועד התור. ניתן להחליף עם לקוח אחר בלחיצה על כפתור
                ההחלפה
              </Text>
              {appointment.crew_member.phone && (
                <Pressable
                  onPress={() => {
                    const phone = appointment.crew_member.phone!.replace(/\D/g, '');
                    Linking.openURL(
                      `https://wa.me/${phone.startsWith('0') ? phone.slice(1) : phone}`
                    );
                  }}
                  className="mt-2 flex-row items-center justify-center gap-1.5 rounded-full border border-gray-200 py-2">
                  <Ionicons name="logo-whatsapp" size={15} color="#111827" />
                  <Text className="text-xs font-medium text-gray-900">
                    שלח הודעה ל{appointment.crew_member.full_name}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      cancelMutation.isPending,
      cancellingId,
      formatDate,
      formatTime,
      screenWidth,
      handleCancelAppointment,
    ]
  );

  if (isLoading || appointments.length === 0) {
    return null;
  }

  return (
    <View className="gap-2" style={{ direction: 'rtl' }}>
      <View>
        <Text className=" px-4 text-center text-xl font-semibold text-black">
          התורים הקרובים שלך
        </Text>
        <Text className="font-neutral-500 text-center text-base font-light">
          אפשר לגלול לצד כדי לראות את כל התורים
        </Text>
      </View>
      <FlashList
        data={appointments}
        renderItem={renderAppointmentItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={screenWidth}
        decelerationRate="fast"
        estimatedItemSize={screenWidth}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      />

      {appointments.length > 1 && (
        <View className="flex-row justify-center gap-2 pt-3">
          {appointments.map((_, index) => (
            <View
              key={index}
              className={`h-[2px] w-[2px] rounded-full ${
                index === currentIndex ? 'bg-neutral-900' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default UpcomingAppointments;

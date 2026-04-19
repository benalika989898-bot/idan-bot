import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { useAuth } from '@/contexts/AuthContext';
import { useComprehensiveAvailability } from '@/hooks/useComprehensiveAvailability';
import { useDateFormat } from '@/hooks/useDateFormat';
import { DateSelectionStep, TimeSelectionStep } from '@/screens/modals/actions/components/booking';
import AppointmentSum from '@/screens/modals/actions/components/booking/AppointmentSum';
import {
  NAVIGATION_BUTTONS_HEIGHT,
  getNavigationButtonsBottomOffset,
  getNavigationButtonsReservedSpace,
} from '@/components/booking/NavigationButtons';
import {
  createSwapRequest,
  getSwapCandidates,
  sendSwapNotification,
} from '@/services/appointmentSwaps';
import { getCustomerAppointmentById } from '@/services/appointments';
import { updateAppointmentTime } from '@/services/crew/appointments';
import { getAvailableTimeSlots } from '@/services/crew/schedules';
import { AppEmptyState } from '@/shared/ui/base/empty-state';
import { generateAvailableDays, parseTimeSlot } from '@/utils/appointment';

const SwapAppointmentScreen = () => {
  const { appointmentId: appointmentIdParam, customerOnly: customerOnlyParam } =
    useLocalSearchParams<{
      appointmentId?: string | string[];
      customerOnly?: string | string[];
    }>();
  const appointmentId = Array.isArray(appointmentIdParam)
    ? appointmentIdParam[0]
    : appointmentIdParam;
  const isCustomerOnly =
    (Array.isArray(customerOnlyParam) ? customerOnlyParam[0] : customerOnlyParam) === 'true';
  const insets = useSafeAreaInsets();
  const compactSummaryBottom = getNavigationButtonsReservedSpace(insets.bottom);
  const swapNavigationBottom = getNavigationButtonsBottomOffset(insets.bottom);
  const { formatDate, formatTime } = useDateFormat();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(isCustomerOnly ? 2 : 0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);

  const { data: appointment, isLoading: loadingAppointment } = useQuery({
    queryKey: ['swap-appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const { data, error } = await getCustomerAppointmentById(appointmentId);
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId,
  });

  useEffect(() => {
    if (appointment?.appointment_date) {
      setSelectedDate(appointment.appointment_date);
    }
  }, [appointment?.appointment_date]);

  const availableDays = useMemo(() => {
    return generateAvailableDays().map((day) => ({
      ...day,
      display: formatDate(day.date, true),
    }));
  }, [formatDate]);

  const {
    disabledDates: comprehensiveDisabledDates,
    availabilityCalculated: comprehensiveCalculated,
  } = useComprehensiveAvailability(appointment?.crew_member, appointment?.appointment_type);

  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: [
      'swap-available-slots',
      appointment?.crew_member?.id,
      selectedDate,
      appointment?.appointment_type?.duration_minutes,
    ],
    queryFn: async () => {
      if (!appointment?.crew_member?.id || !selectedDate) return [];
      const { data, error } = await getAvailableTimeSlots(
        appointment.crew_member.id,
        selectedDate,
        appointment.appointment_type.duration_minutes
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!appointment?.crew_member?.id && !!selectedDate,
  });

  const { data: swapCandidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: [
      'swap-candidates',
      appointment?.crew_member?.id,
      selectedDate,
      appointment?.appointment_type?.id,
      appointment?.id,
    ],
    queryFn: async () => {
      if (!appointment?.crew_member?.id || !appointment?.appointment_type?.id || !appointment?.id) {
        return [];
      }
      const { data, error } = await getSwapCandidates({
        crewMemberId: appointment.crew_member.id,
        appointmentDate: selectedDate,
        appointmentTypeId: appointment.appointment_type.id,
        excludeAppointmentId: appointment.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!appointment?.crew_member?.id && !!selectedDate,
  });

  const createSwapMutation = useMutation({
    mutationFn: async (recipientAppointmentId: string) => {
      const recipient = swapCandidates.find((item) => item.id === recipientAppointmentId);
      if (!recipient?.customer?.id || !appointment?.id) {
        throw new Error('לא ניתן ליצור בקשה');
      }
      if (!user?.id) {
        throw new Error('לא ניתן לשלוח בקשה');
      }
      const { data, error } = await createSwapRequest({
        requesterAppointmentId: appointment.id,
        recipientAppointmentId,
        recipientId: recipient.customer.id,
        requesterId: user.id,
      });
      if (error || !data) throw error || new Error('לא ניתן ליצור בקשה');

      const { error: notificationError } = await sendSwapNotification({
        requestId: data.id,
        type: 'request',
      });
      if (notificationError) throw notificationError;

      return data;
    },
    onSuccess: () => {
      toast.success('הבקשה נשלחה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      router.back();
    },
    onError: (error: any) => {
      const message =
        error?.code === '23505'
          ? 'כבר קיימת בקשה להחלפה עבור התור הזה'
          : error?.message || 'לא ניתן לשלוח בקשה להחלפה';
      toast.error(message);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!appointment || !selectedTimeSlot) {
        throw new Error('אנא בחר שעה');
      }
      const { startTime, endTime } = parseTimeSlot(
        selectedTimeSlot,
        appointment.appointment_type.duration_minutes
      );
      const { error } = await updateAppointmentTime(appointment.id, {
        appointment_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('התור עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      router.back();
    },
    onError: (error: any) => {
      const message = error?.message || 'לא ניתן לעדכן את התור';
      toast.error(message);
    },
  });
  if (!appointmentId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">לא נמצא תור</Text>
      </View>
    );
  }

  if (loadingAppointment || !appointment) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const candidateList = swapCandidates.filter((candidate) => candidate.customer?.id !== user?.id);
  const stepTitles = isCustomerOnly
    ? ['בקשת החלפה', 'בקשת החלפה', 'בקשת החלפה']
    : ['בחירת תאריך', 'שעות פנויות', 'בקשת החלפה'];
  const nextStep = () => {
    if (currentStep < 2) {
      const next = currentStep + 1;
      setCurrentStep(next);
      pagerRef.current?.setPage(next);
      progressValue.value = withSpring(next);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      pagerRef.current?.setPage(prev);
      progressValue.value = withSpring(prev);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ direction: 'rtl' }}>
      {!selectedTimeSlot && (
        <View
          style={{ paddingTop: Platform.OS === 'android' ? insets.top * 2 : insets.top / 3 }}
          className="flex-row items-center justify-between px-6 pb-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="close" size={20} color="#000" />
          </Pressable>
          <Text className="text-2xl font-bold text-black">{stepTitles[currentStep]}</Text>
          <View className="h-10 w-10" />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1, direction: 'rtl' }}
          initialPage={isCustomerOnly ? 2 : 0}
          onPageSelected={(e) => {
            const position = e.nativeEvent.position;
            setCurrentStep(position);
            progressValue.value = withSpring(position);
          }}
          scrollEnabled={false}
          layoutDirection="rtl">
          <DateSelectionStep
            key="swap-step-date"
            availableDays={availableDays}
            selectedDate={selectedDate}
            setSelectedDate={(date) => {
              setSelectedDate(date);
              setSelectedTimeSlot('');
            }}
            disabledDates={comprehensiveDisabledDates}
            availabilityCalculated={comprehensiveCalculated}
            propCrewMember={appointment.crew_member}
            propAppointmentType={appointment.appointment_type}
          />

          <View key="swap-step-time" className="flex-1">
            <TimeSelectionStep
              loading={loadingSlots}
              availableSlots={availableSlots}
              selectedTimeSlot={selectedTimeSlot}
              setSelectedTimeSlot={setSelectedTimeSlot}
              durationMinutes={appointment.appointment_type?.duration_minutes}
              footerComponent={
                loadingCandidates ? (
                  <View className="items-center py-6">
                    <ActivityIndicator size="small" color="#9CA3AF" />
                  </View>
                ) : candidateList.length > 0 ? (
                  <View className="px-6 py-6">
                    <Pressable
                      onPress={nextStep}
                      className="flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                      <Text className="text-center text-sm font-semibold text-gray-700">
                        החלף תור עם לקוח אחר
                      </Text>
                      <Ionicons name="swap-vertical" size={18} color="#374151" />
                    </Pressable>
                  </View>
                ) : undefined
              }
            />
          </View>

          <View key="swap-step-candidates" className="flex-1">
            {candidateList.length > 0 && (
              <View className="px-6 pb-4 pt-2">
                <Text className="text-center text-xl font-semibold text-black">
                  תורים קיימים באותו יום
                </Text>
                <Text className="text-center text-sm text-gray-500">אותו שירות ואותו איש צוות</Text>
              </View>
            )}

            {loadingCandidates ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : (
              <FlashList
                data={candidateList}
                estimatedItemSize={140}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 24 }}
                renderItem={({ item }) => (
                  <View className="mb-4 rounded-2xl bg-neutral-100 px-6 py-5">
                    <Text className="text-center text-sm text-gray-500">לקוח אנונימי</Text>
                    <Text className="mt-2 text-center text-2xl font-semibold text-gray-900">
                      {formatTime(item.start_time, item.end_time)}
                    </Text>
                    <Pressable
                      onPress={() => createSwapMutation.mutate(item.id)}
                      disabled={createSwapMutation.isPending}
                      className="mt-4 w-full items-center justify-center rounded-full bg-black py-4">
                      {createSwapMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-center text-base font-semibold text-white">
                          בקש החלפה
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={
                  <AppEmptyState
                    icon={<Ionicons name="swap-vertical-outline" size={34} color="#737373" />}
                    title="אין תורים זמינים להחלפה"
                    description="אין כרגע לקוחות אחרים עם אותו סוג תור ביום הזה"
                  />
                }
              />
            )}
          </View>
        </PagerView>
      </View>

      {!isCustomerOnly && !selectedTimeSlot && currentStep <= 2 && (
        <View
          style={{ bottom: swapNavigationBottom }}
          className="absolute left-6 right-6">
          <View className="flex-row gap-3">
            {currentStep > 0 && (
              <Pressable
                onPress={prevStep}
                className="flex-1 items-center justify-center rounded-lg border border-gray-200 bg-neutral-300 py-4"
                style={{ minHeight: NAVIGATION_BUTTONS_HEIGHT }}>
                <Text className="text-lg font-medium text-gray-600">חזור</Text>
              </Pressable>
            )}
            {currentStep === 0 && (
              <Pressable
                onPress={nextStep}
                disabled={!selectedDate}
                className={`flex-1 items-center justify-center rounded-lg py-4 ${
                  !selectedDate ? 'bg-gray-200' : 'bg-black'
                }`}
                style={{ minHeight: NAVIGATION_BUTTONS_HEIGHT }}>
                <Text
                  className={`text-lg font-medium ${!selectedDate ? 'text-gray-400' : 'text-white'}`}>
                  המשך
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {!isCustomerOnly && (
        <View
          className="absolute w-full"
          style={
            !selectedTimeSlot
              ? {
                  bottom: compactSummaryBottom,
                  padding: 24,
                }
              : {
                  bottom: 0,
                  top: 0,
                }
          }>
          <AppointmentSum
            chosenCustomer={appointment.crew_member}
            chosenAppointmentType={appointment.appointment_type}
            chosenAppointmentDate={selectedDate}
            chosenAppointmentTime={selectedTimeSlot}
            previousAppointmentDate={appointment.appointment_date}
            previousAppointmentTime={appointment.start_time}
            forceCompact={!selectedTimeSlot}
            showTimeInCompact
            isBooking={rescheduleMutation.isPending}
            onBack={() => setSelectedTimeSlot('')}
            onBookAppointment={() => rescheduleMutation.mutate()}
          />
        </View>
      )}
    </View>
  );
};

export default SwapAppointmentScreen;

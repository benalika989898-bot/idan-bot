import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, RefreshControl, Platform } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import dayjs from 'dayjs';

import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { fetchCustomers } from '@/services/crew/profiles';
import { fetchAppointmentTypesByCrewMember } from '@/services/crew/appointmentTypes';
import { createAppointmentWithTickets, CreateAppointmentData } from '@/services/crew/appointments';
import { getAvailableTimeSlots } from '@/services/crew/schedules';
import { getCrewSlotInterval } from '@/services/crew/members';
import {
  CustomerSelectionStep,
  AppointmentTypeStep,
  TimeSelectionStep,
} from '@/screens/modals/actions/components/booking';
import AppointmentSum from '@/screens/modals/actions/components/booking/AppointmentSum';
import NavigationButtons, {
  getNavigationButtonsReservedSpace,
} from '@/components/booking/NavigationButtons';

const CalendarBookAppointmentScreen = () => {
  const insets = useSafeAreaInsets();
  const compactSummaryBottom = getNavigationButtonsReservedSpace(insets.bottom);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    prefillDate?: string | string[];
    crewMemberId?: string | string[];
    prefillTime?: string | string[];
    slotStartTime?: string | string[];
    slotEndTime?: string | string[];
    useTimePicker?: string | string[];
  }>();

  const crewMemberId = Array.isArray(params.crewMemberId)
    ? params.crewMemberId[0]
    : params.crewMemberId || user?.id;
  const prefillDate = Array.isArray(params.prefillDate)
    ? params.prefillDate[0]
    : params.prefillDate;
  const prefillTime = Array.isArray(params.prefillTime)
    ? params.prefillTime[0]
    : params.prefillTime;
  const slotStartTime = Array.isArray(params.slotStartTime)
    ? params.slotStartTime[0]
    : params.slotStartTime;
  const slotEndTime = Array.isArray(params.slotEndTime)
    ? params.slotEndTime[0]
    : params.slotEndTime;
  const useTimePicker = Array.isArray(params.useTimePicker)
    ? params.useTimePicker[0]
    : params.useTimePicker;
  const selectedDate = prefillDate || dayjs().format('YYYY-MM-DD');

  const { data: crewSlotInterval = 30 } = useQuery({
    queryKey: ['crewSlotInterval', crewMemberId],
    queryFn: () => getCrewSlotInterval(crewMemberId!),
    enabled: !!crewMemberId,
  });
  const slotIntervalMinutes = crewSlotInterval;

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(
    null
  );
  const slotDurationMinutes = selectedAppointmentType?.duration_minutes || slotIntervalMinutes;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAutoSelectedTime = useRef(false);
  const summaryCustomer = useMemo<User>(() => {
    if (selectedCustomer) return selectedCustomer;
    return {
      id: 'placeholder-customer',
      full_name: 'בחר לקוח',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role: 'customer',
    };
  }, [selectedCustomer]);
  const shouldExpandSummary = !!selectedTimeSlot && !!selectedAppointmentType && !!selectedCustomer;

  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: async () => {
      const { data, error } = await fetchCustomers();
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointmentTypes', crewMemberId],
    queryFn: async () => {
      if (!crewMemberId) return [];
      const { data, error } = await fetchAppointmentTypesByCrewMember(crewMemberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!crewMemberId,
  });

  const isAdmin = user?.role === 'admin';

  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['calendar-book-slots', crewMemberId, selectedDate, slotDurationMinutes, isAdmin],
    queryFn: async () => {
      if (!crewMemberId || !selectedDate) return [];
      const { data, error } = await getAvailableTimeSlots(
        crewMemberId,
        selectedDate,
        slotDurationMinutes,
        { ignoreSchedule: true, ignoreBreaks: true, allowPast: isAdmin }
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!crewMemberId && !!selectedDate,
  });

  const constrainedSlots = useMemo(() => {
    if (!slotStartTime || !slotEndTime) return availableSlots;
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map((value) => Number(value));
      const safeHours = Number.isFinite(hours) ? hours : 0;
      const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
      return safeHours * 60 + safeMinutes;
    };
    const startLimit = toMinutes(slotStartTime);
    const endLimit = toMinutes(slotEndTime);
    return availableSlots.filter((slot) => {
      const start = toMinutes(slot.start_time);
      const end = toMinutes(slot.end_time);
      return start >= startLimit && end <= endLimit;
    });
  }, [availableSlots, slotEndTime, slotStartTime]);

  useEffect(() => {
    if (hasAutoSelectedTime.current) return;
    if (!prefillTime || selectedTimeSlot || constrainedSlots.length === 0) return;
    const match = constrainedSlots.find((slot) =>
      slot.start_time.startsWith(prefillTime.slice(0, 5))
    );
    if (match) {
      setSelectedTimeSlot(`${match.start_time}-${match.end_time}`);
      hasAutoSelectedTime.current = true;
    }
  }, [constrainedSlots, prefillTime, selectedTimeSlot]);

  const handleCustomerSelect = (customer: User) => {
    setSelectedCustomer(customer);
    if (currentStep === 1) nextStep();
  };

  const handleAppointmentTypeSelection = (type: AppointmentType) => {
    setSelectedAppointmentType(type);
    if (currentStep === 0) nextStep();
  };

  const handleTimeSelection = (slotId: string) => {
    setSelectedTimeSlot(slotId);
  };

  const canBookAppointment = () =>
    !!selectedTimeSlot && !!selectedCustomer && !!selectedAppointmentType;

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return selectedAppointmentType !== null;
      case 2:
        return selectedAppointmentType !== null && selectedCustomer !== null;
      case 3:
        return (
          selectedAppointmentType !== null && selectedCustomer !== null && selectedTimeSlot !== ''
        );
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 2) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      pagerRef.current?.setPage(newStep);
      progressValue.value = withSpring(newStep);
    }
  };

  const createAppointmentMutation = useMutation({
    mutationFn: createAppointmentWithTickets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['quickSlots'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['crewAvailabilityFast'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });

      router.back();
      setTimeout(() => toast.success('התור נקבע בהצלחה!'), 300);
    },
    onError: (error: any) => {
      if (
        error?.code === 'P0001' ||
        error?.message?.includes('overlap') ||
        error?.message?.includes('conflict')
      ) {
        toast.error('השעה הזו מתנגשת עם תור קיים. אנא בחר שעה אחרת.');
      } else {
        toast.error('לא ניתן ליצור את התור');
      }
    },
  });

  const handleBookAppointment = async () => {
    if (!canBookAppointment() || !crewMemberId || !selectedAppointmentType) {
      return;
    }

    const [startTime] = selectedTimeSlot.split('-');
    if (!startTime) return;

    const startDate = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(
      startDate.getTime() + selectedAppointmentType.duration_minutes * 60000
    );
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    const { data: validSlots } = await getAvailableTimeSlots(
      crewMemberId,
      selectedDate,
      selectedAppointmentType.duration_minutes,
      { ignoreSchedule: true, ignoreBreaks: true, allowPast: isAdmin }
    );

    const isValid = (validSlots || []).some(
      (slot) =>
        slot.start_time.startsWith(startTime.slice(0, 5)) && slot.end_time.startsWith(endTime)
    );

    if (!isValid) {
      toast.error('השעה הזו מתנגשת עם תור קיים. אנא בחר שעה אחרת.');
      return;
    }

    const appointmentData: CreateAppointmentData = {
      appointment_type_id: selectedAppointmentType.id,
      appointment_date: selectedDate,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      crew_member_id: crewMemberId,
      ignore_breaks: true,
      customer_id: selectedCustomer?.id,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
        await queryClient.invalidateQueries({ queryKey: ['appointmentTypes', crewMemberId] });
        await queryClient.invalidateQueries({ queryKey: ['calendar-book-slots'] });
        setIsRefreshing(false);
      }}
      tintColor="#666"
      colors={['#666']}
    />
  );

  const stepTitles = ['סוג השירות', 'בחירת לקוח', 'בחירת שעה'];

  if (!crewMemberId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">אין איש צוות זמין</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, direction: 'rtl' }} className="bg-white">
      <View
        style={{ paddingTop: Platform.OS === 'android' ? insets.top * 2 : insets.top / 3 }}
        className="flex-row items-center justify-between px-6 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text className="text-2xl font-bold text-black">{stepTitles[currentStep]}</Text>
        {currentStep === 1 ? (
          <Pressable
            onPress={() => router.push('/(modal)/add-customer')}
            className="h-10 w-10 items-center justify-center rounded-full bg-black"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1, direction: 'rtl' }}
          initialPage={0}
          onPageSelected={(e) => {
            const position = e.nativeEvent.position;
            setCurrentStep(position);
            progressValue.value = withSpring(position);
          }}
          scrollEnabled={false}
          layoutDirection="rtl">
          <AppointmentTypeStep
            key="step1"
            appointmentTypes={appointmentTypes}
            selectedAppointmentType={selectedAppointmentType}
            setSelectedAppointmentType={handleAppointmentTypeSelection}
            refreshControl={refreshControl}
          />

          <CustomerSelectionStep
            key="step2"
            selectedCustomer={selectedCustomer}
            onCustomerSelect={handleCustomerSelect}
            customers={customers}
            loading={loadingCustomers}
            refreshControl={refreshControl}
          />

          <TimeSelectionStep
            key="step3"
            loading={loadingSlots}
            availableSlots={constrainedSlots}
            selectedTimeSlot={selectedTimeSlot}
            setSelectedTimeSlot={handleTimeSelection}
            prefillTime={prefillTime}
            minuteInterval={slotIntervalMinutes}
            durationMinutes={selectedAppointmentType?.duration_minutes}
            showTimePicker={false}
            showSlotList={true}
            refreshControl={refreshControl}
          />
        </PagerView>
      </View>

      {!shouldExpandSummary && (
        <NavigationButtons
          currentStep={currentStep}
          canProceedToNext={canProceedToStep(currentStep + 1)}
          canBookAppointment={canBookAppointment()}
          onPrevious={prevStep}
          onNext={nextStep}
          onBookAppointment={handleBookAppointment}
        />
      )}

      <View
        className="absolute w-full"
        style={
          shouldExpandSummary
            ? { bottom: 0, top: 0 }
            : {
                bottom: compactSummaryBottom,
                paddingHorizontal: 24,
                paddingBottom: 24,
              }
        }>
        <AppointmentSum
          chosenCustomer={summaryCustomer}
          chosenAppointmentType={selectedAppointmentType}
          chosenAppointmentDate={selectedDate}
          chosenAppointmentTime={selectedTimeSlot}
          forceCompact={!shouldExpandSummary}
          showTimeInCompact
          ticketCustomerId={selectedCustomer?.id}
          ticketCrewMemberId={crewMemberId}
          isBooking={createAppointmentMutation.isPending}
          onBack={() => {
            hasAutoSelectedTime.current = true;
            setSelectedTimeSlot('');
            const targetStep = 2;
            setCurrentStep(targetStep);
            pagerRef.current?.setPage(targetStep);
            progressValue.value = withSpring(targetStep);
          }}
          onBookAppointment={handleBookAppointment}
        />
      </View>
    </View>
  );
};

export default CalendarBookAppointmentScreen;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { toast } from 'sonner-native';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { fetchAppointmentTypesByCrewMember } from '@/services/crew/appointmentTypes';
import {
  fetchCrewDateSchedules,
  fetchCrewSchedule,
  fetchCrewScheduleMode,
  getAvailableTimeSlots,
} from '@/services/crew/schedules';
import { createAppointmentWithTickets, CreateAppointmentData } from '@/services/crew/appointments';
import { fetchCustomers } from '@/services/crew/profiles';
import { fetchBreakDates } from '@/services/crew/breakDates';
import { getCustomerTicketBalanceForCrew } from '@/services/crew/tickets';
import { timeToMinutes } from '@/utils/dateUtils';
import {
  CustomerSelectionStep,
  AppointmentTypeStep,
  DateSelectionStep,
  TimeSelectionStep,
} from '@/screens/modals/actions/components/booking';
import AppointmentSum from '@/screens/modals/actions/components/booking/AppointmentSum';
import NavigationButtons, {
  getNavigationButtonsReservedSpace,
} from '@/components/booking/NavigationButtons';

const BookAppointmentScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { formatDate } = useDateFormat();
  const pagerRef = useRef<PagerView>(null);
  const progressValue = useSharedValue(0);

  // Simple state - one useState per piece of data
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [calculatingAvailability, setCalculatingAvailability] = useState(false);
  const compactSummaryBottom =
    currentStep === 0
      ? Math.max(insets.bottom, 12) + 12
      : getNavigationButtonsReservedSpace(insets.bottom);

  // Data fetching with React Query
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['allCustomers'],
    queryFn: async () => {
      const { data, error } = await fetchCustomers();
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointmentTypes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await fetchAppointmentTypesByCrewMember(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
  const { data: ticketBalance = 0 } = useQuery({
    queryKey: ['customer-tickets', selectedCustomer?.id, user?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id || !user?.id) return 0;
      const { data, error } = await getCustomerTicketBalanceForCrew(selectedCustomer.id, user.id);
      if (error) throw error;
      return data || 0;
    },
    enabled:
      !!selectedCustomer?.id && !!user?.id && selectedAppointmentType?.can_use_tickets !== false,
    staleTime: 30 * 1000,
  });
  const canToggleTicketUsage =
    selectedAppointmentType?.can_use_tickets !== false && ticketBalance > 0;
  const [useTicket, setUseTicket] = useState(false);

  useEffect(() => {
    setUseTicket(canToggleTicketUsage);
  }, [canToggleTicketUsage, selectedAppointmentType?.id, selectedCustomer?.id, user?.id]);

  // Fetch break dates for the current user
  const { data: breakDates = [] } = useQuery({
    queryKey: ['breakDates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await fetchBreakDates(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isAdmin = user?.role === 'admin';

  // Generate 14 days (+ 30 past days for admin)
  const availableDays = useMemo(() => {
    const days = [];
    const today = new Date();

    if (isAdmin) {
      let pastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      pastDate.setDate(pastDate.getDate() - 30);
      while (pastDate < today) {
        if (pastDate.getDay() !== 6) {
          const year = pastDate.getFullYear();
          const month = String(pastDate.getMonth() + 1).padStart(2, '0');
          const day = String(pastDate.getDate()).padStart(2, '0');
          days.push({
            date: `${year}-${month}-${day}`,
            display: formatDate(`${year}-${month}-${day}`),
          });
        }
        pastDate.setDate(pastDate.getDate() + 1);
      }
    }

    let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let futureCount = 0;
    while (futureCount < 14) {
      // Skip Saturday
      if (currentDate.getDay() !== 6) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');

        days.push({
          date: `${year}-${month}-${day}`,
          display: formatDate(`${year}-${month}-${day}`),
        });
        futureCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  }, [isAdmin]);

  const { data: scheduleMode } = useQuery({
    queryKey: ['crew-schedule-mode', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await fetchCrewScheduleMode(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: weeklySchedule = [], isLoading: isLoadingWeeklySchedule } = useQuery({
    queryKey: ['crew-schedule', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await fetchCrewSchedule(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && scheduleMode === 'static',
  });

  const { data: dateSchedules = [], isLoading: isLoadingDateSchedules } = useQuery({
    queryKey: [
      'crew-date-schedule',
      user?.id,
      availableDays[0]?.date,
      availableDays[availableDays.length - 1]?.date,
    ],
    queryFn: async () => {
      if (!user?.id || availableDays.length === 0) return [];
      const { data, error } = await fetchCrewDateSchedules(
        user.id,
        availableDays[0].date,
        availableDays[availableDays.length - 1].date
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && scheduleMode === 'dynamic' && availableDays.length > 0,
  });

  const scheduleLoaded =
    !!scheduleMode &&
    (scheduleMode === 'static' ? !isLoadingWeeklySchedule : !isLoadingDateSchedules);

  const isDateInRange = (date: string, startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isFullDayBreak = (date: string) =>
    breakDates.some(
      (breakDate) =>
        !breakDate.start_time &&
        !breakDate.end_time &&
        isDateInRange(date, breakDate.start_date, breakDate.end_date)
    );

  const hasScheduleForDate = (date: string) => {
    if (!scheduleLoaded || !scheduleMode) {
      return true;
    }

    if (scheduleMode === 'dynamic') {
      const scheduleList = Array.isArray(dateSchedules) ? dateSchedules : [];
      return scheduleList.some((slot) => slot.schedule_date === date && slot.is_active);
    }

    const dayOfWeek = new Date(date).getDay();
    const scheduleList = Array.isArray(weeklySchedule) ? weeklySchedule : [];
    return scheduleList.some((slot) => slot.day_of_week === dayOfWeek && slot.is_active);
  };

  const dateNotes = useMemo(() => {
    if (!scheduleLoaded) return {};
    const notes: Record<string, string> = {};
    availableDays.forEach((day) => {
      if (isFullDayBreak(day.date)) {
        notes[day.date] = 'יום הפסקה';
      } else if (!hasScheduleForDate(day.date)) {
        notes[day.date] = 'מחוץ לשעות עבודה';
      }
    });
    return notes;
  }, [availableDays, hasScheduleForDate, isFullDayBreak, scheduleLoaded]);

  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: [
      'availableSlots',
      user?.id,
      selectedDate,
      selectedAppointmentType?.id,
      'crew-admin-unrestricted',
    ],
    queryFn: async () => {
      if (!user?.id || !selectedDate || !selectedAppointmentType) return [];
      const { data, error } = await getAvailableTimeSlots(
        user.id,
        selectedDate,
        selectedAppointmentType.duration_minutes,
        { ignoreSchedule: true, ignoreBreaks: true, allowPast: isAdmin }
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!selectedDate && !!selectedAppointmentType,
  });

  const refetchSlots = () => {
    queryClient.invalidateQueries({
      queryKey: [
        'availableSlots',
        user?.id,
        selectedDate,
        selectedAppointmentType?.id,
        'crew-admin-unrestricted',
      ],
    });
  };

  // Handle customer from params
  useEffect(() => {
    if (params.selectedCustomer) {
      try {
        const customer = JSON.parse(params.selectedCustomer as string);
        setSelectedCustomer(customer);
      } catch (error) {
        console.error('Error parsing selected customer:', error);
      }
    }
  }, [params.selectedCustomer]);

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 3) {
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

  const handleAppointmentTypeSelection = async (type: AppointmentType) => {
    setSelectedAppointmentType(type);
    setSelectedDate('');

    if (currentStep === 1) {
      // Start calculating availability
      setCalculatingAvailability(true);

      try {
        // Wait a brief moment for the state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        nextStep();
      } finally {
        // The DateSelectionStep will handle setting calculatingAvailability to false
      }
    }
  };

  const handleCustomerSelect = (customer: User) => {
    setSelectedCustomer(customer);
    if (currentStep === 0) {
      nextStep();
    }
  };

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(''); // Clear selected time slot when date changes
    const note = dateNotes[date];
    if (note) {
      toast.info(note);
    }
    if (currentStep === 2) nextStep();
  };

  const breakHoursForSelectedDate = useMemo(
    () =>
      breakDates.filter(
        (breakDate) =>
          breakDate.start_time &&
          breakDate.end_time &&
          isDateInRange(selectedDate, breakDate.start_date, breakDate.end_date)
      ),
    [breakDates, isDateInRange, selectedDate]
  );

  const scheduleBlocksForSelectedDate = useMemo(() => {
    if (!scheduleLoaded || !scheduleMode || !selectedDate) return [];
    if (scheduleMode === 'dynamic') {
      return dateSchedules.filter((slot) => slot.schedule_date === selectedDate && slot.is_active);
    }
    const dayOfWeek = new Date(selectedDate).getDay();
    return weeklySchedule.filter((slot) => slot.day_of_week === dayOfWeek && slot.is_active);
  }, [dateSchedules, scheduleLoaded, scheduleMode, selectedDate, weeklySchedule]);

  const getSlotWarning = (slotId: string) => {
    if (!selectedDate) return null;
    const [startTime, endTime] = slotId.split('-');
    if (!startTime || !endTime) return null;

    if (isFullDayBreak(selectedDate)) {
      return 'שעות הפסקה';
    }

    const slotStart = timeToMinutes(startTime);
    const slotEnd = timeToMinutes(endTime);

    const hasBreakOverlap = breakHoursForSelectedDate.some((brk) => {
      const breakStart = timeToMinutes(brk.start_time!.slice(0, 5));
      const breakEnd = timeToMinutes(brk.end_time!.slice(0, 5));
      return slotStart < breakEnd && slotEnd > breakStart;
    });

    if (hasBreakOverlap) {
      return 'שעות הפסקה';
    }

    if (scheduleBlocksForSelectedDate.length === 0) {
      return 'מחוץ לשעות עבודה';
    }

    const isWithinSchedule = scheduleBlocksForSelectedDate.some((slot) => {
      const scheduleStart = timeToMinutes(slot.start_time.slice(0, 5));
      const scheduleEnd = timeToMinutes(slot.end_time.slice(0, 5));
      return slotStart >= scheduleStart && slotEnd <= scheduleEnd;
    });

    if (!isWithinSchedule) {
      return 'מחוץ לשעות עבודה';
    }

    return null;
  };

  const handleTimeSlotSelection = (slotId: string) => {
    setSelectedTimeSlot(slotId);
    const note = getSlotWarning(slotId);
    if (note) {
      toast.info(note);
    }
  };

  // Validation
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return selectedCustomer !== null;
      case 2:
        return canProceedToStep(1) && selectedAppointmentType !== null;
      case 3:
        return canProceedToStep(2) && selectedDate !== '';
      default:
        return true;
    }
  };

  const canBookAppointment = () => {
    return canProceedToStep(3) && selectedTimeSlot !== '';
  };

  // Appointment creation
  const createAppointmentMutation = useMutation({
    mutationFn: createAppointmentWithTickets,
    onSuccess: () => {
      // Invalidate all relevant caches immediately
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['quickSlots'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] }); // Invalidate ticket balance
      queryClient.invalidateQueries({ queryKey: ['crewAvailabilityFast'] }); // Invalidate availability calculation cache
      queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });

      router.back();
      setTimeout(() => toast.success('התור נקבע בהצלחה!'), 300);
    },
    onError: (error: any) => {
      // If it's an overlap error, refresh slots to show updated availability
      if (
        error?.code === 'P0001' ||
        error?.message?.includes('overlap') ||
        error?.message?.includes('conflict')
      ) {
        console.log('🔄 [BookAppointment] Overlap detected, refreshing slots...');
        // Force refresh both the slots and availability calculation
        refetchSlots();
        queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
        queryClient.invalidateQueries({ queryKey: ['crewAvailabilityFast'] });
        queryClient.invalidateQueries({ queryKey: ['customer-tickets'] }); // Also invalidate tickets in case of error
        toast.error('השעה הזו מתנגשת עם תור קיים. אנא בחר שעה אחרת.');
      } else {
        console.error('❌ [BookAppointment] Create appointment error:', error);
        toast.error('לא ניתן ליצור את התור');
      }
    },
  });

  const handleBookAppointment = () => {
    if (
      !canBookAppointment() ||
      !selectedAppointmentType ||
      !selectedTimeSlot ||
      !user?.id ||
      !selectedCustomer
    ) {
      return;
    }

    let startTime: string;
    let endTime: string;

    if (selectedTimeSlot.includes('-')) {
      [startTime, endTime] = selectedTimeSlot.split('-');
    } else {
      startTime = selectedTimeSlot;
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(
        startDate.getTime() + selectedAppointmentType.duration_minutes * 60000
      );
      endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }

    const appointmentData: CreateAppointmentData = {
      appointment_type_id: selectedAppointmentType.id,
      appointment_date: selectedDate,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      crew_member_id: user.id,
      ignore_breaks: true,
      customer_id: selectedCustomer.id,
      use_ticket: useTicket,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  // Refresh
  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
        await queryClient.invalidateQueries({ queryKey: ['appointmentTypes', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['breakDates', user?.id] });
        setIsRefreshing(false);
      }}
      tintColor="#666"
      colors={['#666']}
    />
  );

  const stepTitles = ['בחירת לקוח', 'סוג השירות', 'בחירת תאריך', 'בחירת שעה'];

  return (
    <View style={{ flex: 1, direction: 'rtl' }} className="bg-white">
      {/* Header */}
      <View
        style={{ paddingTop: Platform.OS === 'android' ? insets.top * 2 : insets.top / 3 }}
        className="flex-row items-center justify-between px-6 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text className="text-2xl font-bold text-black">{stepTitles[currentStep]}</Text>
        {currentStep === 0 ? (
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

      {/* Steps */}
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
          <CustomerSelectionStep
            key="step1"
            selectedCustomer={selectedCustomer}
            onCustomerSelect={handleCustomerSelect}
            customers={customers}
            loading={loadingCustomers}
            refreshControl={refreshControl}
          />

          <AppointmentTypeStep
            key="step2"
            appointmentTypes={appointmentTypes}
            selectedAppointmentType={selectedAppointmentType}
            setSelectedAppointmentType={handleAppointmentTypeSelection}
            refreshControl={refreshControl}
          />

          <DateSelectionStep
            key="step3"
            availableDays={availableDays}
            selectedDate={selectedDate}
            setSelectedDate={handleDateSelection}
            disabledDates={[]}
            refreshControl={refreshControl}
            externalCalculatingState={calculatingAvailability}
            onCalculatingComplete={() => setCalculatingAvailability(false)}
            propCrewMember={user}
            propAppointmentType={selectedAppointmentType}
            availabilityCalculated={true}
            dateNotes={dateNotes}
          />

          <TimeSelectionStep
            key="step4"
            loading={loadingSlots}
            availableSlots={availableSlots}
            selectedTimeSlot={selectedTimeSlot}
            setSelectedTimeSlot={handleTimeSlotSelection}
            durationMinutes={selectedAppointmentType?.duration_minutes}
            refreshControl={refreshControl}
          />
        </PagerView>
      </View>
      {/* Navigation Buttons */}
      {!selectedTimeSlot && currentStep > 0 && (
        <NavigationButtons
          currentStep={currentStep}
          canProceedToNext={canProceedToStep(currentStep + 1)}
          canBookAppointment={canBookAppointment()}
          onPrevious={prevStep}
          onNext={nextStep}
          onBookAppointment={handleBookAppointment}
        />
      )}

      {/* Appointment Summary */}
      <View
        className="absolute w-full"
        style={
          selectedTimeSlot
            ? { bottom: 0, top: 0 }
            : {
                bottom: compactSummaryBottom,
                paddingHorizontal: 24,
                paddingBottom: 24,
              }
        }>
        <AppointmentSum
          chosenCustomer={selectedCustomer}
          chosenAppointmentType={selectedAppointmentType}
          chosenAppointmentDate={selectedDate}
          chosenAppointmentTime={selectedTimeSlot}
          ticketBalance={ticketBalance}
          useTicket={useTicket}
          onUseTicketChange={setUseTicket}
          isBooking={createAppointmentMutation.isPending}
          onBack={() => setSelectedTimeSlot('')}
          onBookAppointment={handleBookAppointment}
        />
      </View>
    </View>
  );
};

export default BookAppointmentScreen;

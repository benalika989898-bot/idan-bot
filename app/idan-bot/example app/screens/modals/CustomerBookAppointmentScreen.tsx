import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl, Platform } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { getCustomerTicketBalanceForCrew } from '@/services/crew/tickets';
import {
  AppointmentTypeStep,
  DateSelectionStep,
  TimeSelectionStep,
} from '@/screens/modals/actions/components/booking';
import CrewMemberSelectionStep from '@/screens/modals/actions/components/customer/CrewMemberSelectionStep';
import AppointmentSum from '@/screens/modals/actions/components/booking/AppointmentSum';
import NavigationButtons, {
  getNavigationButtonsReservedSpace,
} from '@/components/booking/NavigationButtons';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Custom hooks
import { useCrewMembers, useAppointmentTypesByCrewMember } from '@/hooks/useAppointmentData';
import { useAvailabilityCalculation } from '@/hooks/useAvailabilityCalculation';
import { useComprehensiveAvailability } from '@/hooks/useComprehensiveAvailability';
import { useWaitingList } from '@/hooks/useWaitingList';
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking';
import { useAppointmentNavigation } from '@/hooks/useAppointmentNavigation';
import { useAppointmentRefresh } from '@/hooks/useAppointmentRefresh';

// Utilities
import { generateAvailableDays, stepTitles } from '@/utils/appointment';

const CustomerBookAppointmentScreen = () => {
  const insets = useSafeAreaInsets();
  const compactSummaryBottom = getNavigationButtonsReservedSpace(insets.bottom);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatDate } = useDateFormat();
  const selectedDateRef = React.useRef(selectedDate);

  React.useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Navigation and state management
  const navigation = useAppointmentNavigation();
  const {
    currentStep,
    selectedCrewMember,
    selectedAppointmentType,
    selectedDate,
    selectedTimeSlot,
    isRefreshing,
    pagerRef,
    progressValue,
    setCurrentStep,
    setSelectedTimeSlot,
    setIsRefreshing,
    canProceedToStep,
    nextStep,
    prevStep,
    handleCrewMemberSelection,
    handleAppointmentTypeSelection,
    handleDateSelection,
    handlePageSelected,
  } = navigation;

  // Data fetching
  const { data: crewMembers = [], isLoading: loadingCrew } = useCrewMembers();
  const { data: appointmentTypes = [] } = useAppointmentTypesByCrewMember(selectedCrewMember?.id);
  const { data: ticketBalance = 0 } = useQuery({
    queryKey: ['customer-tickets', user?.id, selectedCrewMember?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCrewMember?.id) return 0;
      const { data, error } = await getCustomerTicketBalanceForCrew(user.id, selectedCrewMember.id);
      if (error) throw error;
      return data || 0;
    },
    enabled:
      !!user?.id && !!selectedCrewMember?.id && selectedAppointmentType?.can_use_tickets !== false,
    staleTime: 30 * 1000,
  });
  const canToggleTicketUsage =
    selectedAppointmentType?.can_use_tickets !== false && ticketBalance > 0;
  const [useTicket, setUseTicket] = React.useState(false);

  React.useEffect(() => {
    setUseTicket(canToggleTicketUsage);
  }, [canToggleTicketUsage, selectedAppointmentType?.id, selectedCrewMember?.id, user?.id]);

  // Availability calculation
  const { disabledDates, availabilityCalculated, updateDisabledDatesForAppointmentType } =
    useAvailabilityCalculation(selectedCrewMember, appointmentTypes);

  // Update disabled dates when appointment type changes
  React.useEffect(() => {
    updateDisabledDatesForAppointmentType(selectedAppointmentType);
  }, [selectedAppointmentType, updateDisabledDatesForAppointmentType]);

  // Use comprehensive availability for time slots and disabled dates
  const {
    getTimeSlotsForDate,
    isLoading: comprehensiveLoading,
    availabilityCalculated: comprehensiveCalculated,
    disabledDates: comprehensiveDisabledDates,
  } = useComprehensiveAvailability(selectedCrewMember, selectedAppointmentType);

  // Get time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !comprehensiveCalculated) return [];
    return getTimeSlotsForDate(selectedDate);
  }, [selectedDate, getTimeSlotsForDate, comprehensiveCalculated]);

  const loadingSlots = comprehensiveLoading || !comprehensiveCalculated;

  // Use comprehensive disabled dates or fallback to old calculation
  const effectiveDisabledDates = useMemo(() => {
    if (comprehensiveCalculated && selectedCrewMember && selectedAppointmentType) {
      return comprehensiveDisabledDates;
    }
    return disabledDates; // Fallback to old calculation
  }, [
    comprehensiveCalculated,
    selectedCrewMember,
    selectedAppointmentType,
    comprehensiveDisabledDates,
    disabledDates,
  ]);

  // Waiting list
  const { existingWaitingList, handleWaitingListAction } = useWaitingList(
    user,
    selectedAppointmentType,
    selectedCrewMember
  );

  // Appointment booking
  const { canBookAppointment, handleBookAppointment, isBooking } = useAppointmentBooking(
    selectedCrewMember,
    selectedAppointmentType,
    selectedDate,
    selectedTimeSlot,
    setSelectedTimeSlot,
    setCurrentStep,
    pagerRef,
    progressValue
  );

  // Pull to refresh
  const { handlePullRefresh } = useAppointmentRefresh(
    selectedCrewMember,
    selectedDate,
    selectedAppointmentType,
    setIsRefreshing
  );

  // Focus effect for data refresh - refresh dynamic appointment data
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Appointment booking screen opened - refreshing dynamic data...');

      // Invalidate only frequently changing data
      queryClient.invalidateQueries({ queryKey: ['allCrewSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['crewAvailabilityFast'] });
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      queryClient.invalidateQueries({ queryKey: ['userWaitingList'] });
    }, [queryClient])
  );

  const invalidateAvailability = useCallback(
    (changedDate?: string) => {
      if (!selectedCrewMember?.id) return;

      queryClient.invalidateQueries({
        queryKey: ['comprehensiveAvailability', selectedCrewMember.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['crewAvailabilityFast', selectedCrewMember.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['breakDates', selectedCrewMember.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['crewSchedule', selectedCrewMember.id],
      });

      const currentSelectedDate = selectedDateRef.current;
      if (currentSelectedDate && (!changedDate || changedDate === currentSelectedDate)) {
        queryClient.invalidateQueries({
          queryKey: ['availableSlots', selectedCrewMember.id, currentSelectedDate],
        });
      }
    },
    [queryClient, selectedCrewMember?.id]
  );

  const isDateInRange = useCallback((date: string, startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  }, []);

  // Listen for realtime availability updates via Supabase broadcast
  React.useEffect(() => {
    if (!selectedCrewMember?.id) return;

    const crewMemberId = selectedCrewMember.id;
    console.log('📡 [Customer Booking] Setting up availability broadcast listeners...');

    const scheduleChannel = supabase.channel('schedule-updates');
    const appointmentChannel = supabase.channel(`crew-appointments-${crewMemberId}`);
    const breakChannel = supabase.channel('break-hours-updates');

    scheduleChannel
      .on('broadcast', { event: 'schedule_updated' }, (payload) => {
        const { crew_member_id } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('📅 [Customer Booking] Schedule updated - refreshing availability');
          invalidateAvailability();
          toast.info('לוח הזמנים עודכן - זמינות עודכנה');
        }
      })
      .subscribe();

    appointmentChannel
      .on('broadcast', { event: 'appointment_booked' }, (payload) => {
        const { crew_member_id, appointment_date } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('📅 [Customer Booking] Appointment booked - refreshing availability');
          invalidateAvailability(appointment_date);
          if (appointment_date === selectedDateRef.current) {
            toast.info('תור נתפס - הזמנים עודכנו');
          }
        }
      })
      .on('broadcast', { event: 'appointment_cancelled' }, (payload) => {
        const { crew_member_id, appointment_date } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('📅 [Customer Booking] Appointment cancelled - refreshing availability');
          invalidateAvailability(appointment_date);
          if (appointment_date === selectedDateRef.current) {
            toast.success('תור בוטל - ייתכן שנפתחו זמנים');
          }
        }
      })
      .subscribe();

    breakChannel
      .on('broadcast', { event: 'break_hours_added' }, (payload) => {
        const { crew_member_id, date } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('🚫 [Customer Booking] Break hours added - refreshing availability');
          invalidateAvailability(date);
          if (date === selectedDateRef.current) {
            toast.info('שעות הפסקה נוספו - הזמנים עודכנו');
          }
        }
      })
      .on('broadcast', { event: 'break_hours_removed' }, (payload) => {
        const { crew_member_id, date } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('✅ [Customer Booking] Break hours removed - refreshing availability');
          invalidateAvailability(date);
          if (date === selectedDateRef.current) {
            toast.success('זמנים נוספים זמינים עכשיו!');
          }
        }
      })
      .on('broadcast', { event: 'break_dates_updated' }, (payload) => {
        const { crew_member_id, start_date, end_date } = payload.payload;
        if (crew_member_id === crewMemberId) {
          console.log('🗓️ [Customer Booking] Break dates updated - refreshing availability');
          invalidateAvailability();
          const currentSelectedDate = selectedDateRef.current;
          if (currentSelectedDate && isDateInRange(currentSelectedDate, start_date, end_date)) {
            toast.info('ימי הפסקה עודכנו - הזמינות השתנתה');
          }
        }
      })
      .subscribe();

    return () => {
      console.log('📡 [Customer Booking] Cleaning up availability broadcast listeners');
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(breakChannel);
    };
  }, [invalidateAvailability, isDateInRange, selectedCrewMember?.id]);

  React.useEffect(() => {
    if (!selectedTimeSlot || loadingSlots) return;
    const stillAvailable = availableSlots.some(
      (slot) => `${slot.start_time}-${slot.end_time}` === selectedTimeSlot
    );

    if (!stillAvailable) {
      setSelectedTimeSlot('');
      toast.info('הזמינות השתנתה - בחירת השעה אופסה');
    }
  }, [availableSlots, loadingSlots, selectedTimeSlot, setSelectedTimeSlot]);

  // Available days
  const availableDays = useMemo(() => {
    const days = generateAvailableDays();
    return days.map((day) => ({
      ...day,
      display: formatDate(day.date),
    }));
  }, [formatDate]);

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handlePullRefresh}
      tintColor="#666"
      colors={['#666']}
    />
  );

  return (
    <View style={{ flex: 1, direction: 'rtl' }} className="bg-white py-6">
      {/* Header with Step Title and Close Button */}
      <View
        style={{
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}
        className="flex-row items-center justify-between px-6">
        <Pressable
          onPress={() => {
            router.back();
          }}
          className="h-8 w-8 items-center justify-center">
          <Ionicons name="close" size={24} color="black" />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-semibold  text-black">
          {stepTitles[currentStep]}
        </Text>
        <View className="w-8" />
      </View>

      {/* Page View */}
      <View style={{ flex: 1 }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1, direction: 'rtl' }}
          initialPage={0}
          onPageSelected={(e) => {
            const position = e.nativeEvent.position;
            handlePageSelected(position);
          }}
          scrollEnabled={false}
          layoutDirection="rtl">
          {/* Step 1: Crew Member Selection */}
          <CrewMemberSelectionStep
            key="step1"
            crewMembers={crewMembers}
            selectedCrewMember={selectedCrewMember}
            setSelectedCrewMember={handleCrewMemberSelection}
            loading={loadingCrew}
            refreshControl={refreshControl}
          />

          {/* Step 2: Appointment Type Selection */}
          <AppointmentTypeStep
            key="step2"
            appointmentTypes={appointmentTypes}
            selectedAppointmentType={selectedAppointmentType}
            setSelectedAppointmentType={handleAppointmentTypeSelection}
            refreshControl={refreshControl}
          />

          {/* Step 3: Date Selection */}
          <DateSelectionStep
            key="step3"
            availableDays={availableDays}
            selectedDate={selectedDate}
            setSelectedDate={handleDateSelection}
            disabledDates={effectiveDisabledDates}
            refreshControl={refreshControl}
            showWaitingList={true}
            onWaitingListAction={handleWaitingListAction}
            existingWaitingListDates={existingWaitingList.map((item) => item.preferred_date)}
            propCrewMember={selectedCrewMember}
            propAppointmentType={selectedAppointmentType}
            availabilityCalculated={comprehensiveCalculated || availabilityCalculated}
          />

          {/* Step 4: Time Selection */}
          <TimeSelectionStep
            key="step4"
            loading={loadingSlots}
            availableSlots={availableSlots}
            selectedTimeSlot={selectedTimeSlot}
            setSelectedTimeSlot={setSelectedTimeSlot}
            durationMinutes={selectedAppointmentType?.duration_minutes}
            refreshControl={refreshControl}
          />
        </PagerView>
      </View>

      {/* Navigation Buttons */}
      {!selectedTimeSlot && (
        <NavigationButtons
          currentStep={currentStep}
          canProceedToNext={canProceedToStep(currentStep + 1)}
          canBookAppointment={canBookAppointment(user)}
          onPrevious={prevStep}
          onNext={nextStep}
          onBookAppointment={() => handleBookAppointment(user, useTicket)}
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
                padding: 24,
              }
        }>
        <AppointmentSum
          chosenCustomer={selectedCrewMember}
          chosenAppointmentType={selectedAppointmentType}
          chosenAppointmentDate={selectedDate}
          chosenAppointmentTime={selectedTimeSlot}
          ticketBalance={ticketBalance}
          useTicket={useTicket}
          onUseTicketChange={setUseTicket}
          isBooking={isBooking}
          onBack={() => {
            setSelectedTimeSlot('');
          }}
          onBookAppointment={() => handleBookAppointment(user, useTicket)}
        />
      </View>
    </View>
  );
};

export default CustomerBookAppointmentScreen;

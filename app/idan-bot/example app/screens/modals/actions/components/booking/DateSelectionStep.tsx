import { useComprehensiveAvailability } from '@/hooks/useComprehensiveAvailability';
import { useDateFormat } from '@/hooks/useDateFormat';
import { supabase } from '@/lib/supabase';
import { useAppointmentBookingStore } from '@/stores/appointmentBookingStore';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

interface Day {
  date: string;
  display: string;
}

interface DateSelectionStepProps {
  availableDays: Day[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  disabledDates?: string[];
  dateNotes?: Record<string, string>;
  refreshControl?: React.ReactElement;
  showWaitingList?: boolean;
  onJoinWaitingList?: (date: string) => void;
  onWaitingListAction?: (date: string, isAlreadyRegistered: boolean) => void;
  existingWaitingListDates?: string[];
  externalCalculatingState?: boolean;
  onCalculatingComplete?: () => void;
  propCrewMember?: any;
  propAppointmentType?: any;
  availabilityCalculated?: boolean;
}

const DateSelectionStep: React.FC<DateSelectionStepProps> = ({
  availableDays,
  selectedDate,
  setSelectedDate,
  disabledDates = [],
  dateNotes = {},
  refreshControl,
  showWaitingList = false,
  onJoinWaitingList,
  onWaitingListAction,
  existingWaitingListDates = [],
  externalCalculatingState,
  onCalculatingComplete,
  propCrewMember,
  propAppointmentType,
  availabilityCalculated = true,
}) => {
  const {
    selectedCrewMember,
    selectedAppointmentType,
    crewSchedule,
    dateAvailability,
    calculatingAvailability,
    calculateDateAvailability,
  } = useAppointmentBookingStore();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();

  // Use comprehensive availability for better performance
  const currentCrewMember = propCrewMember || selectedCrewMember;
  const currentAppointmentType = propAppointmentType || selectedAppointmentType;

  const {
    disabledDates: comprehensiveDisabledDates,
    isLoading: comprehensiveLoading,
    isDateAvailable: isDateAvailableComprehensive,
    getUnavailabilityReason,
    availabilityCalculated: comprehensiveCalculated,
    hasAnyAvailableSlots,
  } = useComprehensiveAvailability(currentCrewMember, currentAppointmentType);

  // Determine which availability system to use
  const shouldUseComprehensive = currentCrewMember && currentAppointmentType && !propCrewMember;
  const effectiveDisabledDates = shouldUseComprehensive
    ? comprehensiveDisabledDates
    : disabledDates;
  const effectiveAvailabilityCalculated = shouldUseComprehensive
    ? comprehensiveCalculated
    : availabilityCalculated;

  // Loading state for waiting list actions
  const [loadingWaitingList, setLoadingWaitingList] = useState<string | null>(null);

  // Optimistic updates to prevent flicker
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, boolean>>({});

  // Auto-calculate availability when crew member and appointment type are selected
  // Only use old store-based calculation when NOT using comprehensive availability
  useEffect(() => {
    if (
      !shouldUseComprehensive &&
      selectedCrewMember &&
      selectedAppointmentType &&
      dateAvailability.size === 0
    ) {
      console.log('🔄 [DateSelection] Auto-calculating availability using store (fallback)');
      calculateDateAvailability(availableDays).then(() => {
        if (onCalculatingComplete) {
          onCalculatingComplete();
        }
      });
    } else if (shouldUseComprehensive && onCalculatingComplete && comprehensiveCalculated) {
      // For comprehensive availability, call completion callback when ready
      onCalculatingComplete();
    }
  }, [
    shouldUseComprehensive,
    selectedCrewMember,
    selectedAppointmentType,
    availableDays,
    dateAvailability.size,
    calculateDateAvailability,
    onCalculatingComplete,
    comprehensiveCalculated,
  ]);

  // Listen for schedule updates via Supabase broadcast
  useEffect(() => {
    const currentCrewMember = propCrewMember || selectedCrewMember;
    if (!currentCrewMember?.id) return;

    console.log('📡 [DateSelection] Setting up schedule update broadcast listener...');

    const channel = supabase.channel('schedule-updates');

    channel
      .on('broadcast', { event: 'schedule_updated' }, (payload) => {
        const { crew_member_id, operation } = payload.payload;

        // Only react to changes for the currently selected crew member
        if (crew_member_id === currentCrewMember.id) {
          console.log(
            `📅 [DateSelection] Schedule updated for crew member ${crew_member_id} (${operation}) - refreshing availability`
          );

          // Invalidate and refetch availability-related data
          queryClient.invalidateQueries({
            queryKey: ['crewAvailabilityFast', crew_member_id],
          });
          queryClient.invalidateQueries({
            queryKey: ['allCrewSchedules'],
          });

          // For store-based flow, recalculate availability (only if not using comprehensive)
          if (
            !shouldUseComprehensive &&
            !propCrewMember &&
            selectedCrewMember &&
            selectedAppointmentType
          ) {
            calculateDateAvailability(availableDays);
          }

          // Show user-friendly notification
          console.log('🔄 [DateSelection] Schedule updated - availability recalculated');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 [DateSelection] Schedule update broadcast subscription active');
        }
      });

    return () => {
      console.log('📡 [DateSelection] Cleaning up schedule update broadcast subscription');
      supabase.removeChannel(channel);
    };
  }, [
    propCrewMember?.id,
    selectedCrewMember?.id,
    selectedAppointmentType,
    calculateDateAvailability,
    availableDays,
    queryClient,
  ]);

  // Create a map of day_of_week to whether the crew member has ANY active schedules
  const dayAvailabilityMap = useMemo(() => {
    const map = new Map<number, boolean>();

    // First, set all days to false
    for (let day = 0; day <= 6; day++) {
      map.set(day, false);
    }

    // Then, set to true if there's at least one active schedule for that day
    crewSchedule.forEach((schedule) => {
      if (schedule.is_active) {
        map.set(schedule.day_of_week, true);
      }
    });

    return map;
  }, [crewSchedule]);

  const isDateAvailable = (
    date: string
  ): { available: boolean; reason?: string; loading?: boolean } => {
    const dayOfWeek = new Date(date).getDay();

    // Use comprehensive availability system when available
    if (shouldUseComprehensive) {
      if (comprehensiveLoading) {
        return { available: false, reason: 'בודק זמינות...', loading: true };
      }

      const isAvailable = isDateAvailableComprehensive(date);
      if (!isAvailable) {
        const reason = getUnavailabilityReason(date);
        let reasonText = 'אין תורים פנויים';

        switch (reason) {
          case 'past_time':
            reasonText = 'השעה עברה';
            break;
          case 'no_schedule':
            reasonText = 'לא זמין';
            break;
          case 'break_day':
            reasonText = 'יום הפסקה';
            break;
          case 'full_booked':
            reasonText = 'אין תורים פנויים';
            break;
        }

        return { available: false, reason: reasonText };
      }

      return { available: true };
    }

    // Fallback to original logic for prop-based flow
    // Check if this date is explicitly disabled (no available slots)
    if (effectiveDisabledDates.includes(date)) {
      return { available: false, reason: 'אין תורים פנויים' };
    }

    // Check progressive availability calculation results first (only for store-based flow)
    if (!propCrewMember && dateAvailability.has(date)) {
      const hasSlots = dateAvailability.get(date);
      // console.log(`📅 [DateAvailable] ${date}: Store availability = ${hasSlots}`);
      if (!hasSlots) {
        return { available: false, reason: 'אין תורים פנויים' };
      }
      return { available: true };
    }

    // If no crew member is selected yet, show all as disabled
    if (!currentCrewMember) {
      // console.log(`👤 [DateAvailable] ${date}: No crew member selected`);
      return { available: false, reason: 'נא לבחור ספק', loading: true };
    }

    // If no appointment type is selected yet, show all as disabled
    if (!currentAppointmentType) {
      // console.log(`💼 [DateAvailable] ${date}: No appointment type selected`);
      return { available: false, reason: 'נא לבחור סוג טיפול', loading: true };
    }

    // For prop-based flow (customer booking), show loading until availability is calculated
    if (propCrewMember && propAppointmentType) {
      if (!effectiveAvailabilityCalculated) {
        return { available: false, reason: 'בודק זמינות...', loading: true };
      }
      // Availability is calculated and we have both crew member and appointment type
      // The parent component handles disabled dates through disabledDates prop
      // console.log(`✅ [DateAvailable] ${date}: Prop-based flow, checking disabled dates`);
      return { available: true };
    }

    // Store-based flow logic (crew booking)
    const isCalculating =
      externalCalculatingState !== undefined ? externalCalculatingState : calculatingAvailability;

    // If we're calculating or haven't calculated this date yet, show as loading
    if (isCalculating || dateAvailability.size === 0) {
      // console.log(`⏳ [DateAvailable] ${date}: Still calculating or no data`);
      return { available: false, reason: 'בודק זמינות...', loading: true };
    }

    // If crewSchedule is empty, it means we haven't fetched the schedule yet
    // or this is crew booking mode - allow all dates in this case
    if (crewSchedule.length === 0) {
      // console.log(`📋 [DateAvailable] ${date}: No schedule data, allowing`);
      return { available: true };
    }

    // Check if crew member has ANY active schedule for this day of week
    const hasActiveScheduleForDay = dayAvailabilityMap.get(dayOfWeek);
    if (hasActiveScheduleForDay === false) {
      // console.log(`📅 [DateAvailable] ${date}: No schedule for day ${dayOfWeek}`);
      return { available: false, reason: 'לא זמין' };
    }

    // console.log(`✅ [DateAvailable] ${date}: Available by default`);
    return { available: true };
  };
  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 200 }}>
        <View className="px-6 py-6">
          <View className="gap-3">
            {availableDays.map((day, index) => {
              const isSelected = selectedDate === day.date;
              const date = new Date(day.date);
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);

              // Check if this date is available
              const availability = isDateAvailable(day.date);
              const isDisabled = !availability.available;
              const isLoading = availability.loading;

              // Use the hook to get formatted day name
              let dayName = formatDate(day.date);

              // For DateSelectionStep, we want full weekday names instead of abbreviated
              if (!dayName.includes('היום') && !dayName.includes('מחר')) {
                dayName = date.toLocaleDateString('he-IL', {
                  weekday: 'long',
                  timeZone: 'Asia/Jerusalem',
                });
              }

              const dayNumber = date.getDate();
              const monthName = date.toLocaleDateString('he-IL', { month: 'long' });

              // Determine styles based on state
              const getContainerStyles = () => {
                if (isLoading) {
                  return 'rounded-lg border border-gray-200 p-4 bg-gray-100';
                }
                if (isDisabled) {
                  return 'rounded-lg border border-gray-100 p-4 bg-gray-50';
                }
                if (isSelected) {
                  return 'rounded-lg border border-black p-4 bg-black';
                }
                return 'rounded-lg border border-gray-200 p-4 bg-white';
              };

              const getTextColor = (type: 'primary' | 'secondary') => {
                if (isLoading) {
                  return type === 'primary' ? 'text-gray-500' : 'text-gray-400';
                }
                if (isDisabled) {
                  return type === 'primary' ? 'text-gray-400' : 'text-gray-300';
                }
                if (isSelected) {
                  return type === 'primary' ? 'text-white' : 'text-gray-300';
                }
                return type === 'primary' ? 'text-black' : 'text-gray-500';
              };

              return (
                <Pressable
                  key={`day-${day.date}-${index}`}
                  onPress={() => !isDisabled && !isLoading && setSelectedDate(day.date)}
                  disabled={isDisabled || isLoading}
                  className={getContainerStyles()}>
                  <View className="flex-row items-center gap-3">
                    <View className="items-center">
                      <Text className={`text-3xl font-bold ${getTextColor('primary')}`}>
                        {dayNumber}
                      </Text>
                      <Text className={`text-left text-sm ${getTextColor('secondary')}`}>
                        {monthName}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-left text-lg font-semibold ${getTextColor('primary')}`}>
                        {dayName}
                      </Text>
                      {(() => {
                        const note = dateNotes[day.date];
                        const message = availability.reason || note;
                        if (!message) return null;
                        const noteClass = availability.reason ? 'text-gray-400' : 'text-amber-600';
                        return (
                          <Text className={`mt-1 text-left text-xs ${noteClass}`}>{message}</Text>
                        );
                      })()}
                    </View>
                    {isDisabled &&
                      showWaitingList &&
                      (onJoinWaitingList || onWaitingListAction) && (
                        <Pressable
                          key={`waiting-list-${day.date}`}
                          onPress={async () => {
                            const isRegistered = existingWaitingListDates.includes(day.date);
                            setLoadingWaitingList(day.date);

                            // Optimistic update - immediately show the expected state
                            setOptimisticUpdates((prev) => ({
                              ...prev,
                              [day.date]: !isRegistered,
                            }));

                            try {
                              if (onWaitingListAction) {
                                await onWaitingListAction(day.date, isRegistered);
                              } else if (onJoinWaitingList && !isRegistered) {
                                await onJoinWaitingList(day.date);
                              }
                            } catch (error) {
                              // Revert optimistic update on error
                              setOptimisticUpdates((prev) => ({
                                ...prev,
                                [day.date]: isRegistered,
                              }));
                            } finally {
                              setLoadingWaitingList(null);
                              // Clear optimistic update after a delay to allow server state to update
                              setTimeout(() => {
                                setOptimisticUpdates((prev) => {
                                  const { [day.date]: _, ...rest } = prev;
                                  return rest;
                                });
                              }, 500);
                            }
                          }}
                          disabled={loadingWaitingList === day.date}
                          className={`rounded-lg px-3 py-2 ${
                            loadingWaitingList === day.date
                              ? 'bg-gray-400'
                              : (() => {
                                  // Use optimistic state if available, otherwise use actual state
                                  const isRegisteredOptimistic = optimisticUpdates.hasOwnProperty(
                                    day.date
                                  )
                                    ? optimisticUpdates[day.date]
                                    : existingWaitingListDates.includes(day.date);
                                  return isRegisteredOptimistic ? 'bg-red-600' : 'bg-gray-800';
                                })()
                          }`}>
                          {loadingWaitingList === day.date ? (
                            <View className="flex-row items-center justify-center gap-2">
                              <Text className="text-center text-xs text-white">מעדכן...</Text>
                              <ActivityIndicator size="small" color="white" />
                            </View>
                          ) : (
                            <Text className="text-center text-xs text-white">
                              {(() => {
                                // Use optimistic state if available, otherwise use actual state
                                const isRegisteredOptimistic = optimisticUpdates.hasOwnProperty(
                                  day.date
                                )
                                  ? optimisticUpdates[day.date]
                                  : existingWaitingListDates.includes(day.date);
                                return isRegisteredOptimistic ? 'בטל הרשמה' : 'כניסה לרשימת המתנה';
                              })()}
                            </Text>
                          )}
                        </Pressable>
                      )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default DateSelectionStep;

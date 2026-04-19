import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchCrewDateSchedules, fetchCrewSchedule, fetchCrewScheduleMode } from '@/services/crew/schedules';
import { fetchBreakDates } from '@/services/crew/breakDates';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { getMinutesBetween, generateAvailableDays } from '@/utils/appointment';
import { getCurrentIsraelDateString, getCurrentIsraelTimeMinutes, timeToMinutes } from '@/utils/dateUtils';

export const useAvailabilityCalculation = (
  selectedCrewMember: User | null,
  appointmentTypes: AppointmentType[]
) => {
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [availabilityCalculated, setAvailabilityCalculated] = useState(false);

  const setDisabledDatesIfChanged = useCallback((nextDates: string[]) => {
    setDisabledDates((prev) => {
      if (prev.length === nextDates.length && prev.every((date, index) => date === nextDates[index])) {
        return prev;
      }
      return nextDates;
    });
  }, []);
  
  const availableDays = generateAvailableDays();

  // Fetch break dates for the selected crew member
  const { data: breakDates = [] } = useQuery({
    queryKey: ['breakDates', selectedCrewMember?.id],
    queryFn: async () => {
      if (!selectedCrewMember?.id) return [];
      const { data, error } = await fetchBreakDates(selectedCrewMember.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCrewMember?.id,
  });

  // Generate disabled dates from break dates (only for full-day breaks)
  const disabledDatesFromBreaks = useMemo(() => {
    const disabled = [];
    
    for (const breakDate of breakDates) {
      // Only disable entire days for full-day breaks (no specific start/end times)
      if (!breakDate.start_time || !breakDate.end_time) {
        const startDate = new Date(breakDate.start_date);
        const endDate = new Date(breakDate.end_date);
        
        // Add all dates in the range (inclusive)
        for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          disabled.push(formattedDate);
        }
      }
      // For break hours with specific times, let the time slot generation handle the exclusion
    }
    
    return disabled;
  }, [breakDates]);

  const availabilityQueries = useQuery({
    queryKey: ['crewAvailabilityFast', selectedCrewMember?.id, appointmentTypes.map((t) => t.id)],
    queryFn: async () => {
      const startTime = Date.now();
      if (!selectedCrewMember?.id || !appointmentTypes.length) return {};

      const fetchStartTime = Date.now();
      
      console.log('🔍 [Appointments Query Debug] Crew member ID:', selectedCrewMember.id);
      console.log('🔍 [Appointments Query Debug] Date range:', availableDays[0].date, 'to', availableDays[availableDays.length - 1].date);
      
      // Check if there are ANY appointments in the table
      const allAppointmentsCheck = await supabase
        .from('appointments')
        .select('*')
        .limit(5);
      console.log('🔍 [All Appointments Debug] Sample appointments:', allAppointmentsCheck.data);
      
      const { data: scheduleMode, error: scheduleModeError } = await fetchCrewScheduleMode(selectedCrewMember.id);
      if (scheduleModeError) throw scheduleModeError;

      const [scheduleResult, appointmentsResult] = await Promise.all([
        scheduleMode === 'dynamic'
          ? fetchCrewDateSchedules(selectedCrewMember.id, availableDays[0].date, availableDays[availableDays.length - 1].date)
          : fetchCrewSchedule(selectedCrewMember.id),
        supabase
          .from('appointments')
          .select('appointment_date, start_time, end_time')
          .eq('crew_member_id', selectedCrewMember.id)
          .gte('appointment_date', availableDays[0].date)
          .lte('appointment_date', availableDays[availableDays.length - 1].date),
      ]);
      
      console.log('🔍 [Appointments Query Debug] Query result:', appointmentsResult);
      if (appointmentsResult.error) {
        console.error('❌ [Appointments Query Debug] Error:', appointmentsResult.error);
      }

      const fetchDuration = Date.now() - fetchStartTime;

      const schedule = scheduleResult.data || [];
      const existingAppointments = appointmentsResult.data || [];

      console.log('🔍 [Availability Debug] Crew member:', selectedCrewMember.full_name);
      console.log('📅 [Availability Debug] Existing appointments:', existingAppointments);
      console.log('⏰ [Availability Debug] Schedule:', schedule);

      const calcStartTime = Date.now();
      const availabilityMap: Record<string, string[]> = {};

      const scheduleByDate = new Map<string, typeof schedule>();
      if (scheduleMode === 'dynamic') {
        schedule.forEach((slot: any) => {
          const dateSlots = scheduleByDate.get(slot.schedule_date) || [];
          dateSlots.push(slot);
          scheduleByDate.set(slot.schedule_date, dateSlots);
        });
      }

      for (const appointmentType of appointmentTypes) {
        const unavailableDates: string[] = [];

        for (const day of availableDays) {
          const dayOfWeek = new Date(day.date).getDay();
          const is15thDec = day.date === '2024-12-15';
          const isToday = day.date === getCurrentIsraelDateString();
          const currentTimeMinutes = getCurrentIsraelTimeMinutes();
          
          // Check if this date is a break date - always mark as unavailable
          if (disabledDatesFromBreaks.includes(day.date)) {
            if (is15thDec) console.log(`🚫 [Debug 15th Dec] Date ${day.date} is a break date`);
            unavailableDates.push(day.date);
            continue;
          }
          
          if (is15thDec) {
            console.log(`🎯 [Debug 15th Dec] Checking date: ${day.date}, day of week: ${dayOfWeek}`);
          }

          const daySchedule = scheduleMode === 'dynamic'
            ? (scheduleByDate.get(day.date) || []).filter((s: any) => s.is_active)
            : (schedule as any[]).filter((s) => s.day_of_week === dayOfWeek && s.is_active);
          if (daySchedule.length === 0) {
            if (is15thDec) console.log(`❌ [Debug 15th Dec] No schedule for day ${dayOfWeek}`);
            unavailableDates.push(day.date);
            continue;
          }

          // Check if today's work hours have already passed
          if (isToday) {
            const latestWorkEnd = Math.max(...daySchedule.map(s => timeToMinutes(s.end_time)));
            if (currentTimeMinutes >= latestWorkEnd) {
              console.log(`⏰ [Availability] Today's work hours have passed (${currentTimeMinutes} >= ${latestWorkEnd}). Marking ${day.date} as unavailable.`);
              unavailableDates.push(day.date);
              continue;
            }
          }

          if (is15thDec) {
            console.log(`📋 [Debug 15th Dec] Day schedule:`, daySchedule);
          }

          let hasAvailableSlot = false;

          for (const workPeriod of daySchedule) {
            const dayAppointments = existingAppointments
              .filter((apt) => apt.appointment_date === day.date)
              .filter((apt) => {
                const startTime = apt.start_time;
                return startTime >= workPeriod.start_time && startTime <= workPeriod.end_time;
              })
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            if (is15thDec) {
              console.log(`📅 [Debug 15th Dec] Day appointments for ${day.date}:`, dayAppointments);
              console.log(`⏰ [Debug 15th Dec] Work period: ${workPeriod.start_time} - ${workPeriod.end_time}`);
            }

            const workStart = workPeriod.start_time;
            const workEnd = workPeriod.end_time;
            const neededDuration = appointmentType.duration_minutes;
            
            if (is15thDec) {
              console.log(`⏱️ [Debug 15th Dec] Needed duration: ${neededDuration} minutes for ${appointmentType.name}`);
            }

            let currentTime = workStart;
            let canFit = false;

            if (is15thDec) {
              console.log(`🔄 [Debug 15th Dec] Starting gap check from: ${currentTime}`);
            }

            for (const apt of dayAppointments) {
              const gapMinutes = getMinutesBetween(currentTime, apt.start_time);
              if (is15thDec) {
                console.log(`🕐 [Debug 15th Dec] Gap from ${currentTime} to ${apt.start_time}: ${gapMinutes} minutes`);
                console.log(`📋 [Debug 15th Dec] Appointment: ${apt.start_time} - ${apt.end_time}`);
              }
              // Check if appointment can fit AND end before work period ends
              const remainingWorkTime = getMinutesBetween(currentTime, workEnd);
              if (gapMinutes >= neededDuration && remainingWorkTime >= neededDuration) {
                canFit = true;
                if (is15thDec) console.log(`✅ [Debug 15th Dec] Can fit! Gap of ${gapMinutes} >= ${neededDuration} and enough time until ${workEnd}`);
                break;
              }
              currentTime = apt.end_time;
            }

            if (!canFit) {
              const finalGapMinutes = getMinutesBetween(currentTime, workEnd);
              if (is15thDec) {
                console.log(`🏁 [Debug 15th Dec] Final gap from ${currentTime} to ${workEnd}: ${finalGapMinutes} minutes`);
              }
              if (finalGapMinutes >= neededDuration) {
                canFit = true;
                if (is15thDec) console.log(`✅ [Debug 15th Dec] Can fit in final gap! ${finalGapMinutes} >= ${neededDuration}`);
              }
            }

            if (canFit) {
              hasAvailableSlot = true;
              break;
            }
          }

          if (!hasAvailableSlot) {
            unavailableDates.push(day.date);
            if (is15thDec) {
              console.log(`🚫 [Debug 15th Dec] Date ${day.date} marked as UNAVAILABLE for ${appointmentType.name}`);
            }
          } else if (is15thDec) {
            console.log(`✅ [Debug 15th Dec] Date ${day.date} marked as AVAILABLE for ${appointmentType.name}`);
          }
        }

        availabilityMap[appointmentType.id] = unavailableDates;
        console.log(`📊 [Availability Debug] ${appointmentType.name}: ${unavailableDates.length} unavailable dates:`, unavailableDates);
      }

      const calcDuration = Date.now() - calcStartTime;
      const totalDuration = Date.now() - startTime;

      return { [selectedCrewMember.id]: availabilityMap };
    },
    enabled: !!selectedCrewMember?.id && appointmentTypes.length > 0,
    staleTime: 1000 * 60 * 3, // Cache for 3 minutes
    gcTime: 1000 * 60 * 6, // Keep in cache for 6 minutes
  });

  useEffect(() => {
    if (!selectedCrewMember?.id) {
      setDisabledDatesIfChanged([]);
      setAvailabilityCalculated(false);
      return;
    }

    if (!availabilityQueries.data) {
      setAvailabilityCalculated(false);
      // Still show break dates even if availability data isn't loaded yet
      setDisabledDatesIfChanged([...disabledDatesFromBreaks]);
      return;
    }

    setAvailabilityCalculated(true);

    // If appointment type is also selected, set disabled dates
    if (appointmentTypes.length > 0) {
      // For now, we'll handle this in the main component when appointment type is selected
      setDisabledDatesIfChanged([...disabledDatesFromBreaks]);
    } else {
      setDisabledDatesIfChanged([...disabledDatesFromBreaks]);
    }
  }, [
    selectedCrewMember?.id,
    appointmentTypes.length,
    availabilityQueries.data,
    disabledDatesFromBreaks,
    setDisabledDatesIfChanged,
  ]);

  const updateDisabledDatesForAppointmentType = useCallback(
    (appointmentType: AppointmentType | null) => {
      if (!selectedCrewMember?.id || !appointmentType || !availabilityQueries.data) {
        setDisabledDatesIfChanged([...disabledDatesFromBreaks]);
        return;
      }

      const unavailableDates =
        availabilityQueries.data[selectedCrewMember.id]?.[appointmentType.id] || [];

      // Combine unavailable dates from scheduling and break dates
      const combinedDisabledDates = [...new Set([...unavailableDates, ...disabledDatesFromBreaks])];
      setDisabledDatesIfChanged(combinedDisabledDates);
    },
    [availabilityQueries.data, disabledDatesFromBreaks, selectedCrewMember?.id, setDisabledDatesIfChanged]
  );

  return {
    disabledDates,
    availabilityCalculated,
    availabilityData: availabilityQueries.data,
    isLoadingAvailability: availabilityQueries.isLoading,
    updateDisabledDatesForAppointmentType,
  };
};

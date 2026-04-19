import { supabase } from '@/lib/supabase';
import { fetchCrewDateSchedules, fetchCrewSchedule, fetchCrewScheduleMode } from '@/services/crew/schedules';
import { fetchBreakDates } from '@/services/crew/breakDates';
import { getCrewSlotInterval } from '@/services/crew/members';
import { 
  getCurrentIsraelDateString, 
  getCurrentIsraelTimeMinutes,
  getIsraelDayOfWeek,
  timeToMinutes,
  minutesToTime 
} from '@/utils/dateUtils';
import { ComprehensiveAvailability, DateAvailability, TimeSlot } from './comprehensiveAvailability';

/**
 * Recalculate availability for specific dates without full recalculation
 */
export async function recalculateSpecificDates(
  existingData: ComprehensiveAvailability,
  datesToRecalculate: string[],
  reason: 'schedule' | 'appointment' | 'break'
): Promise<ComprehensiveAvailability | null> {
  try {
    console.log(`🔄 [AvailabilityUpdater] Recalculating ${datesToRecalculate.length} dates due to ${reason} change:`, datesToRecalculate);
    
    const startTime = Date.now();
    const { crewMemberId, appointmentTypeId, durationMinutes } = existingData;
    
    const { data: scheduleMode, error: scheduleModeError } = await fetchCrewScheduleMode(crewMemberId);
    if (scheduleModeError) {
      console.error('🔴 [AvailabilityUpdater] Error fetching schedule mode:', scheduleModeError);
      return null;
    }

    // Get fresh data for the specific dates
    const sortedDates = [...datesToRecalculate].sort();

    const [
      scheduleResult,
      { data: appointments, error: appointmentsError },
      { data: breakDates, error: breaksError },
      slotInterval
    ] = await Promise.all([
      scheduleMode === 'dynamic'
        ? fetchCrewDateSchedules(crewMemberId, sortedDates[0], sortedDates[sortedDates.length - 1])
        : fetchCrewSchedule(crewMemberId),
      supabase
        .from('appointments')
        .select('appointment_date, start_time, end_time')
        .eq('crew_member_id', crewMemberId)
        .in('appointment_date', datesToRecalculate),
      fetchBreakDates(crewMemberId),
      getCrewSlotInterval(crewMemberId)
    ]);

    const schedule = scheduleResult.data || [];
    const scheduleError = scheduleResult.error;

    if (scheduleError || appointmentsError || breaksError) {
      console.error('🔴 [AvailabilityUpdater] Error fetching data:', { scheduleError, appointmentsError, breaksError });
      return null;
    }

    const currentDate = getCurrentIsraelDateString();
    const currentTimeMinutes = getCurrentIsraelTimeMinutes();
    
    // Group appointments by date for faster lookup
    const appointmentsByDate = new Map<string, typeof appointments>();
    appointments?.forEach(apt => {
      const dateAppts = appointmentsByDate.get(apt.appointment_date) || [];
      dateAppts.push(apt);
      appointmentsByDate.set(apt.appointment_date, dateAppts);
    });

    // Group break dates for faster lookup
    const fullDayBreaks = new Set<string>();
    const breaksByDate = new Map<string, typeof breakDates>();
    
    breakDates?.forEach(brk => {
      const startDate = new Date(brk.start_date);
      const endDate = new Date(brk.end_date);
      
      if (!brk.start_time || !brk.end_time) {
        // Full-day break - mark all dates in range
        for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
          const dateStr = current.toISOString().split('T')[0];
          fullDayBreaks.add(dateStr);
        }
      } else {
        // Time-specific break - group by date
        for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
          const dateStr = current.toISOString().split('T')[0];
          const dateBreaks = breaksByDate.get(dateStr) || [];
          dateBreaks.push(brk);
          breaksByDate.set(dateStr, dateBreaks);
        }
      }
    });

    const scheduleByDate = new Map<string, typeof schedule>();
    if (scheduleMode === 'dynamic') {
      schedule.forEach((slot: any) => {
        const dateSlots = scheduleByDate.get(slot.schedule_date) || [];
        dateSlots.push(slot);
        scheduleByDate.set(slot.schedule_date, dateSlots);
      });
    }

    // Create updated availability data
    const updatedDates = existingData.dates.map(dateAvailability => {
      // If this date doesn't need recalculation, keep existing data
      if (!datesToRecalculate.includes(dateAvailability.date)) {
        return dateAvailability;
      }

      // Recalculate this specific date
      const date = dateAvailability.date;
      const dayOfWeek = getIsraelDayOfWeek(date);
      const isToday = date === currentDate;

      console.log(`🔄 [AvailabilityUpdater] Recalculating ${date}`);

      // Check if it's a full-day break
      if (fullDayBreaks.has(date)) {
        return {
          date,
          isAvailable: false,
          timeSlots: [],
          reason: 'break_day' as const
        };
      }

      // Get schedule for this day
      const daySchedule = scheduleMode === 'dynamic'
        ? (scheduleByDate.get(date) || []).filter(s => s.is_active)
        : (schedule as any[]).filter(s => s.day_of_week === dayOfWeek && s.is_active);
      
      if (daySchedule.length === 0) {
        return {
          date,
          isAvailable: false,
          timeSlots: [],
          reason: 'no_schedule' as const
        };
      }

      // Check if today's work hours have passed
      if (isToday) {
        const latestWorkEnd = Math.max(...daySchedule.map(s => timeToMinutes(s.end_time)));
        if (currentTimeMinutes >= latestWorkEnd) {
          return {
            date,
            isAvailable: false,
            timeSlots: [],
            reason: 'past_time' as const
          };
        }
      }

      // Generate time slots for this day
      const dayTimeSlots: TimeSlot[] = [];
      const mergedSchedule = mergeConsecutiveScheduleBlocks(daySchedule);

      for (const scheduleBlock of mergedSchedule) {
        const blockSlots = generateTimeSlots(
          scheduleBlock.start_time,
          scheduleBlock.end_time,
          durationMinutes,
          slotInterval
        );
        dayTimeSlots.push(...blockSlots);
      }

      // Filter out unavailable slots
      const dayAppointments = appointmentsByDate.get(date) || [];
      const dayBreaks = breaksByDate.get(date) || [];

      const availableSlots = dayTimeSlots.filter(slot => {
        const slotStart = timeToMinutes(slot.start_time);
        const slotEnd = timeToMinutes(slot.end_time);

        // Skip past time slots for today
        if (isToday && slotStart <= currentTimeMinutes) {
          return false;
        }

        // Check appointment overlaps
        const hasAppointmentOverlap = dayAppointments.some(apt => {
          const aptStart = timeToMinutes(apt.start_time.slice(0, 5));
          const aptEnd = timeToMinutes(apt.end_time.slice(0, 5));
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        // Check break overlaps
        const hasBreakOverlap = dayBreaks.some(brk => {
          if (!brk.start_time || !brk.end_time) return false;
          const breakStart = timeToMinutes(brk.start_time.slice(0, 5));
          const breakEnd = timeToMinutes(brk.end_time.slice(0, 5));
          return slotStart < breakEnd && slotEnd > breakStart;
        });

        return !hasAppointmentOverlap && !hasBreakOverlap;
      });

      const finalResult = {
        date,
        isAvailable: availableSlots.length > 0,
        timeSlots: availableSlots,
        reason: availableSlots.length === 0 ? 'full_booked' as const : undefined
      };
      
      console.log(`📊 [AvailabilityUpdater] ${date}: Updated - Available: ${finalResult.isAvailable}, Slots: ${finalResult.timeSlots.length}`);
      return finalResult;
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [AvailabilityUpdater] Updated ${datesToRecalculate.length} dates in ${duration}ms`);

    return {
      ...existingData,
      dates: updatedDates
    };

  } catch (error) {
    console.error('🔴 [AvailabilityUpdater] Error:', error);
    return null;
  }
}

/**
 * Merge consecutive schedule blocks to optimize slot generation
 */
function mergeConsecutiveScheduleBlocks(scheduleSlots: { start_time: string; end_time: string }[]) {
  if (scheduleSlots.length <= 1) return scheduleSlots;

  const sorted = [...scheduleSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    // If current start time equals or overlaps with last merged end time, merge them
    if (timeToMinutes(current.start_time) <= timeToMinutes(lastMerged.end_time)) {
      lastMerged.end_time = timeToMinutes(current.end_time) > timeToMinutes(lastMerged.end_time) 
        ? current.end_time 
        : lastMerged.end_time;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Generate time slots within a time range
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  slotInterval: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  let currentStart = startMinutes;

  while (currentStart + durationMinutes <= endMinutes) {
    const currentEnd = currentStart + durationMinutes;
    
    slots.push({
      start_time: minutesToTime(currentStart),
      end_time: minutesToTime(currentEnd)
    });
    
    currentStart += slotInterval;
  }

  return slots;
}

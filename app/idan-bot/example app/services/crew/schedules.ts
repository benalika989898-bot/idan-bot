import { supabase } from '../../lib/supabase';
import { getCrewSlotInterval } from './members';
import { fetchBreakDates } from './breakDates';
import { 
  getIsraelDayOfWeek, 
  getCurrentIsraelDateString, 
  getCurrentIsraelTimeMinutes,
  timeToMinutes,
  minutesToTime 
} from '../../utils/dateUtils';

export interface CrewSchedule {
  id: string;
  crew_member_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ScheduleMode = 'static' | 'dynamic';

export interface CreateScheduleSlot {
  crew_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface CrewDateSchedule {
  id: string;
  crew_member_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDateScheduleSlot {
  crew_member_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

/**
 * Fetch all schedule slots for a crew member
 */
export async function fetchCrewSchedule(crewMemberId: string): Promise<{ data: CrewSchedule[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crew_schedules')
      .select('*')
      .eq('crew_member_id', crewMemberId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data as CrewSchedule[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetch schedule mode for a crew member
 */
export async function fetchCrewScheduleMode(
  crewMemberId: string
): Promise<{ data: ScheduleMode | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('schedule_mode')
      .eq('id', crewMemberId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: (data?.schedule_mode as ScheduleMode) || 'static', error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update schedule mode for a crew member
 */
export async function updateCrewScheduleMode(
  crewMemberId: string,
  scheduleMode: ScheduleMode
): Promise<{ data: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ schedule_mode: scheduleMode, updated_at: new Date().toISOString() })
      .eq('id', crewMemberId);

    if (error) {
      return { data: false, error };
    }

    // Broadcast schedule mode change
    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: crewMemberId,
            schedule_mode: scheduleMode,
            operation: 'mode_update',
          },
        });
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast schedule mode update:', broadcastError);
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error };
  }
}

/**
 * Fetch date-specific schedule slots for a crew member
 */
export async function fetchCrewDateSchedules(
  crewMemberId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: CrewDateSchedule[] | null; error: any }> {
  try {
    let query = supabase
      .from('crew_date_schedules')
      .select('*')
      .eq('crew_member_id', crewMemberId)
      .eq('is_active', true)
      .order('schedule_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('schedule_date', startDate);
    }
    if (endDate) {
      query = query.lte('schedule_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data as CrewDateSchedule[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Replace all date-specific schedule slots for a specific date
 */
export async function updateDateScheduleForDate(
  crewMemberId: string,
  scheduleDate: string,
  scheduleSlots: CreateDateScheduleSlot[]
): Promise<{ data: boolean; error: any }> {
  try {
    const { error: deleteError } = await supabase
      .from('crew_date_schedules')
      .delete()
      .eq('crew_member_id', crewMemberId)
      .eq('schedule_date', scheduleDate);

    if (deleteError) {
      return { data: false, error: deleteError };
    }

    if (scheduleSlots.length > 0) {
      const { error: insertError } = await supabase
        .from('crew_date_schedules')
        .insert(scheduleSlots);

      if (insertError) {
        return { data: false, error: insertError };
      }
    }

    // Broadcast date schedule update
    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: crewMemberId,
            schedule_date: scheduleDate,
            operation: 'date_update',
          },
        });
      console.log('📡 [Schedules] Date schedule update broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast date schedule update:', broadcastError);
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error };
  }
}

/**
 * Create a single date-specific schedule slot
 */
export async function createDateScheduleSlot(
  slot: CreateDateScheduleSlot
): Promise<{ data: CrewDateSchedule | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crew_date_schedules')
      .insert([slot])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: slot.crew_member_id,
            schedule_date: slot.schedule_date,
            operation: 'date_create',
          },
        });
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast date schedule create:', broadcastError);
    }

    return { data: data as CrewDateSchedule, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Create a new schedule slot
 */
export async function createScheduleSlot(slot: CreateScheduleSlot): Promise<{ data: CrewSchedule | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crew_schedules')
      .insert([slot])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Broadcast schedule change to customers in booking flow
    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: slot.crew_member_id,
            day_of_week: slot.day_of_week,
            operation: 'create',
          },
        });
      console.log('📡 [Schedules] Schedule update broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast schedule update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    return { data: data as CrewSchedule, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update a schedule slot
 */
export async function updateScheduleSlot(
  id: string, 
  updates: Partial<CreateScheduleSlot>
): Promise<{ data: CrewSchedule | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crew_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Broadcast schedule change to customers in booking flow
    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: data.crew_member_id,
            day_of_week: data.day_of_week,
            operation: 'update',
          },
        });
      console.log('📡 [Schedules] Schedule update broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast schedule update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    return { data: data as CrewSchedule, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Delete a schedule slot (soft delete by setting is_active to false)
 */
export async function deleteScheduleSlot(id: string): Promise<{ data: boolean; error: any }> {
  try {
    // First get the schedule info for broadcasting
    const { data: scheduleData } = await supabase
      .from('crew_schedules')
      .select('crew_member_id, day_of_week')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('crew_schedules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { data: false, error };
    }

    // Broadcast schedule change to customers in booking flow
    if (scheduleData) {
      try {
        await supabase
          .channel('schedule-updates')
          .send({
            type: 'broadcast',
            event: 'schedule_updated',
            payload: {
              crew_member_id: scheduleData.crew_member_id,
              day_of_week: scheduleData.day_of_week,
              operation: 'delete',
            },
          });
        console.log('📡 [Schedules] Schedule update broadcast sent successfully');
      } catch (broadcastError) {
        console.warn('⚠️ [Schedules] Failed to broadcast schedule update:', broadcastError);
        // Don't fail the operation if broadcast fails
      }
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error };
  }
}

/**
 * Get available time slots for a crew member on a specific date
 */
export async function getAvailableTimeSlots(
  crewMemberId: string, 
  date: string,
  appointmentDurationMinutes?: number,
  options?: {
    ignoreSchedule?: boolean;
    ignoreBreaks?: boolean;
    allowPast?: boolean;
  }
): Promise<{ data: { start_time: string; end_time: string }[] | null; error: any }> {
  try {
    const { ignoreSchedule = false, ignoreBreaks = false, allowPast = false } = options || {};
    let scheduleSlots: { start_time: string; end_time: string }[] | null = null;
    let scheduleMode: ScheduleMode | null = null;

    const dayOfWeek = getIsraelDayOfWeek(date);
    const slotInterval = await getCrewSlotInterval(crewMemberId);
    
    if (!ignoreSchedule) {
      const { data: scheduleModeData, error: scheduleModeError } = await fetchCrewScheduleMode(
        crewMemberId
      );
      if (scheduleModeError) {
        console.error('🔴 [Schedules] Schedule mode query error:', scheduleModeError);
        return { data: null, error: scheduleModeError };
      }

      scheduleMode = scheduleModeData;

      console.log(
        `🔍 [Schedules] Getting slots for ${crewMemberId} on ${date} (${appointmentDurationMinutes}min) - Day: ${dayOfWeek}, Mode: ${scheduleMode}`
      );

      const scheduleQuery =
        scheduleMode === 'dynamic'
          ? supabase
              .from('crew_date_schedules')
              .select('start_time, end_time')
              .eq('crew_member_id', crewMemberId)
              .eq('schedule_date', date)
              .eq('is_active', true)
          : supabase
              .from('crew_schedules')
              .select('start_time, end_time')
              .eq('crew_member_id', crewMemberId)
              .eq('day_of_week', dayOfWeek)
              .eq('is_active', true);

      const { data: scheduleData, error: scheduleError } = await scheduleQuery;

      if (scheduleError) {
        console.error('🔴 [Schedules] Schedule query error:', scheduleError);
        return { data: null, error: scheduleError };
      }

      scheduleSlots = scheduleData || [];
      console.log(`📋 [Schedules] Found ${scheduleSlots?.length || 0} schedule slots for day ${dayOfWeek}`);
    } else {
      scheduleSlots = [{ start_time: '00:00', end_time: '24:00' }];
    }

    // Debug: First check all appointments for this crew member
    console.log(`🔍 [Schedules] Querying appointments for crew member: "${crewMemberId}"`);
    
    const { data: allAppointments, error: allApptError } = await supabase
      .from('appointments')
      .select('start_time, end_time, id, appointment_date, crew_member_id, customer_id')
      .eq('crew_member_id', crewMemberId);

    console.log(`🔍 [Schedules] Query result - Data:`, allAppointments);
    console.log(`🔍 [Schedules] Query result - Error:`, allApptError);
    console.log(`🔍 [Schedules] ALL appointments for crew member ${crewMemberId}:`, 
      allAppointments?.map(apt => `${apt.appointment_date} ${apt.start_time}-${apt.end_time} (id: ${apt.id})`) || []);
    console.log(`🔍 [Schedules] Looking for appointments on date: "${date}"`);

    // Also try a query without filtering by crew member to see if we get any results at all
    const { data: anyAppointments, error: anyError } = await supabase
      .from('appointments')
      .select('start_time, end_time, id, appointment_date, crew_member_id')
      .limit(5);
    
    console.log(`🔍 [Schedules] Sample of ANY appointments in database:`, anyAppointments);
    console.log(`🔍 [Schedules] Sample query error:`, anyError);

    // Try multiple ways to query for the date in case of format issues
    let appointments = null;
    let appointmentsError = null;

    // First try exact match
    const exactMatch = await supabase
      .from('appointments')
      .select('start_time, end_time, id, appointment_date')
      .eq('crew_member_id', crewMemberId)
      .eq('appointment_date', date);

    console.log(`🔍 [Schedules] Raw appointment date comparison - Looking for: "${date}", Found dates:`, 
      allAppointments?.map(apt => `"${apt.appointment_date}"`) || []);

    // If exact match fails or returns no results, try filtering manually from all appointments
    if (exactMatch.error || !exactMatch.data || exactMatch.data.length === 0) {
      console.log(`⚠️ [Schedules] Exact date match failed or returned 0 results, filtering manually...`);
      appointments = allAppointments?.filter(apt => apt.appointment_date === date) || [];
      appointmentsError = allApptError;
    } else {
      appointments = exactMatch.data;
      appointmentsError = exactMatch.error;
    }

    if (appointmentsError) {
      console.error('🔴 [Schedules] Appointments query error:', appointmentsError);
      return { data: null, error: appointmentsError };
    }

    console.log(`📅 [Schedules] Found ${appointments?.length || 0} existing appointments for ${date}:`, 
      appointments?.map(apt => `${apt.start_time}-${apt.end_time} (id: ${apt.id})`) || []);

    // Fetch break hours for the specific date
    let timeBreaks: { start_time: string; end_time: string }[] = [];
    if (!ignoreBreaks) {
      const { data: breakHours, error: breakError } = await fetchBreakDates(
        crewMemberId,
        date,
        date
      );

      if (breakError) {
        console.error('🔴 [Schedules] Break hours query error:', breakError);
        return { data: null, error: breakError };
      }

      // Filter break hours to only include those with specific times (not full day breaks)
      timeBreaks = breakHours?.filter((breakItem) => breakItem.start_time && breakItem.end_time) || [];
    }
    
    console.log(`🚫 [Schedules] Found ${timeBreaks.length} break periods for ${date}:`, 
      timeBreaks.map(brk => `${brk.start_time}-${brk.end_time}`) || []);

    // Additional debug info
    if (appointments && appointments.length > 0) {
      console.log(`🔍 [Schedules] Appointment details for overlap detection:`, 
        appointments.map(apt => ({
          id: apt.id,
          date: apt.appointment_date,
          start: apt.start_time,
          end: apt.end_time,
          startMinutes: timeToMinutes(apt.start_time.slice(0, 5)),
          endMinutes: timeToMinutes(apt.end_time.slice(0, 5))
        })));
    }

    let availableSlots: { start_time: string; end_time: string }[] = [];

    if (appointmentDurationMinutes && scheduleSlots && scheduleSlots.length > 0) {
      const mergedBlocks = mergeConsecutiveScheduleBlocks(scheduleSlots);
      
      console.log(`🔗 [Schedules] Merged ${scheduleSlots.length} schedule blocks into ${mergedBlocks.length} continuous blocks`);
      
      for (const schedule of mergedBlocks) {
        const generatedSlots = generateTimeSlots(
          schedule.start_time,
          schedule.end_time,
          appointmentDurationMinutes,
          slotInterval
        );
        console.log(`📦 [Schedules] Generated ${generatedSlots.length} slots from ${schedule.start_time}-${schedule.end_time} for ${appointmentDurationMinutes}min duration`);
        availableSlots.push(...generatedSlots);
      }
    } else {
      availableSlots = scheduleSlots || [];
    }

    console.log(`⏰ [Schedules] Generated ${availableSlots.length} potential slots:`, 
      availableSlots.map(slot => `${slot.start_time}-${slot.end_time}`));

    const currentDate = getCurrentIsraelDateString();
    const currentTimeMinutes = getCurrentIsraelTimeMinutes();
    
    console.log(`🕐 [Schedules] Current date: ${currentDate}, current time: ${Math.floor(currentTimeMinutes/60)}:${String(currentTimeMinutes%60).padStart(2,'0')}`);
    
    const filteredSlots = availableSlots.filter(slot => {
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);
      
      // Skip past time slots for today
      if (!allowPast && date === currentDate && slotStart <= currentTimeMinutes) {
        console.log(`⏰ [Schedules] Skipping past slot: ${slot.start_time}-${slot.end_time}`);
        return false;
      }
      
      // Check for overlaps with existing appointments
      const hasAppointmentOverlap = appointments?.some(apt => {
        // Validate appointment times
        if (!apt.start_time || !apt.end_time) {
          console.warn(`⚠️ [Schedules] Invalid appointment time data for ID ${apt.id}:`, apt);
          return false;
        }
        
        // Normalize time format (remove seconds if present)
        const normalizedStartTime = apt.start_time.slice(0, 5); // HH:MM
        const normalizedEndTime = apt.end_time.slice(0, 5); // HH:MM
        
        const aptStart = timeToMinutes(normalizedStartTime);
        const aptEnd = timeToMinutes(normalizedEndTime);
        
        // More precise overlap check: two time ranges overlap if one starts before the other ends
        // This accounts for edge cases where appointments touch but don't actually overlap
        const overlaps = (slotStart < aptEnd && slotEnd > aptStart);
        
        if (overlaps) {
          console.log(`❌ [Schedules] Slot ${slot.start_time}-${slot.end_time} (${slotStart}-${slotEnd} min) overlaps with appointment ${apt.start_time}-${apt.end_time} (${aptStart}-${aptEnd} min) - ID: ${apt.id}`);
        }
        
        return overlaps;
      }) || false; // Default to false if appointments is null/undefined

      // Check for overlaps with break hours
      const hasBreakOverlap = timeBreaks?.some(brk => {
        // Validate break times
        if (!brk.start_time || !brk.end_time) {
          console.warn(`⚠️ [Schedules] Invalid break time data:`, brk);
          return false;
        }
        
        // Normalize time format (remove seconds if present)
        const normalizedStartTime = brk.start_time.slice(0, 5); // HH:MM
        const normalizedEndTime = brk.end_time.slice(0, 5); // HH:MM
        
        const breakStart = timeToMinutes(normalizedStartTime);
        const breakEnd = timeToMinutes(normalizedEndTime);
        
        // Check overlap with break period
        const overlaps = (slotStart < breakEnd && slotEnd > breakStart);
        
        if (overlaps) {
          console.log(`🚫 [Schedules] Slot ${slot.start_time}-${slot.end_time} (${slotStart}-${slotEnd} min) overlaps with break ${brk.start_time}-${brk.end_time} (${breakStart}-${breakEnd} min)`);
        }
        
        return overlaps;
      }) || false; // Default to false if timeBreaks is null/undefined
      
      return !hasAppointmentOverlap && !hasBreakOverlap;
    });

    console.log(`✅ [Schedules] Final available slots (${filteredSlots.length}):`, 
      filteredSlots.map(slot => `${slot.start_time}-${slot.end_time}`));

    return { data: filteredSlots, error: null };
  } catch (error) {
    console.error('🔴 [Schedules] Error getting available slots:', error);
    return { data: null, error };
  }
}

/**
 * Merge consecutive schedule blocks into continuous time blocks
 * This allows long appointments to span multiple adjacent schedule slots
 */
function mergeConsecutiveScheduleBlocks(scheduleBlocks: { start_time: string; end_time: string }[]): { start_time: string; end_time: string }[] {
  if (!scheduleBlocks || scheduleBlocks.length === 0) return [];
  
  const sortedBlocks = [...scheduleBlocks].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  
  const mergedBlocks: { start_time: string; end_time: string }[] = [];
  let currentBlock = { ...sortedBlocks[0] };
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const nextBlock = sortedBlocks[i];
    const currentEndMinutes = timeToMinutes(currentBlock.end_time);
    const nextStartMinutes = timeToMinutes(nextBlock.start_time);
    
    if (currentEndMinutes === nextStartMinutes) {
      currentBlock.end_time = nextBlock.end_time;
    } else {
      mergedBlocks.push(currentBlock);
      currentBlock = { ...nextBlock };
    }
  }
  
  mergedBlocks.push(currentBlock);
  return mergedBlocks;
}

/**
 * Generate time slots for a given time range and duration
 * Ensures appointments don't start at or past the crew schedule end time
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  slotInterval: number = 30
): { start_time: string; end_time: string }[] {
  const slots: { start_time: string; end_time: string }[] = [];
  
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


/**
 * Bulk update crew schedule (replace all slots for a crew member)
 */
export async function updateFullSchedule(
  crewMemberId: string,
  scheduleSlots: CreateScheduleSlot[]
): Promise<{ data: boolean; error: any }> {
  try {
    const { error: deleteError } = await supabase
      .from('crew_schedules')
      .delete()
      .eq('crew_member_id', crewMemberId);

    if (deleteError) {
      return { data: false, error: deleteError };
    }

    if (scheduleSlots.length > 0) {
      const { error: insertError } = await supabase
        .from('crew_schedules')
        .insert(scheduleSlots);

      if (insertError) {
        return { data: false, error: insertError };
      }
    }

    // Broadcast full schedule update to customers in booking flow
    try {
      await supabase
        .channel('schedule-updates')
        .send({
          type: 'broadcast',
          event: 'schedule_updated',
          payload: {
            crew_member_id: crewMemberId,
            operation: 'full_update',
          },
        });
      console.log('📡 [Schedules] Full schedule update broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [Schedules] Failed to broadcast full schedule update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error };
  }
}

/**
 * Get all schedule blocks for a crew member (used by the new UI pattern)
 */
export async function fetchAllScheduleBlocks(crewMemberId: string): Promise<{ data: CrewSchedule[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crew_schedules')
      .select('*')
      .eq('crew_member_id', crewMemberId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data as CrewSchedule[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Check if a specific date has available appointment slots
 */
export async function hasAvailableSlots(
  crewMemberId: string,
  date: string,
  appointmentDurationMinutes: number
): Promise<{ hasSlots: boolean; error: any }> {
  try {
    const { data: slots, error } = await getAvailableTimeSlots(
      crewMemberId,
      date,
      appointmentDurationMinutes
    );

    if (error) {
      return { hasSlots: false, error };
    }

    return { hasSlots: (slots && slots.length > 0), error: null };
  } catch (error) {
    return { hasSlots: false, error };
  }
}

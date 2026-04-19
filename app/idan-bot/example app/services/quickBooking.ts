import { supabase } from '@/lib/supabase';
import { getAvailableTimeSlots } from '@/services/crew/schedules';

export interface QuickSlot {
  id: string;
  crew_member_id: string;
  crew_member_name: string;
  crew_member_avatar: string;
  appointment_type_id: string;
  appointment_type_name: string;
  duration_minutes: number;
  price?: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
}

export async function getNext5AvailableSlotsForType(appointmentType: any): Promise<QuickSlot[]> {
  try {
    console.log(
      '🔵 [QuickBooking] Fetching next 5 available slots for appointment type:',
      appointmentType.name
    );

    // Get crew members
    const { data: crewData, error: crewError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'crew');

    if (crewError) throw crewError;

    if (!crewData || crewData.length === 0) {
      console.log('🟡 [QuickBooking] No active crew members found');
      return [];
    }

    const allSlots: QuickSlot[] = [];
    const now = new Date();
    const israelToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));

    // Check next 7 days for available slots (reduced from 14 for better performance)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      // Get current date in Israel timezone and add offset
      const targetDate = new Date(israelToday);
      targetDate.setDate(israelToday.getDate() + dayOffset);

      // Skip Saturdays (day 6) in Israel timezone
      if (targetDate.getDay() === 6) continue;

      // Get date in Israel timezone format (YYYY-MM-DD)
      const dateStr = targetDate.toLocaleDateString('en-CA');

      const slotResults = await Promise.all(
        crewData.map(async crewMember => {
          console.log(
            `🔍 [QuickBooking] Checking slots for ${crewMember.full_name} on ${dateStr} (${appointmentType.duration_minutes} minutes)`
          );

          const { data: availableSlots, error: slotsError } = await getAvailableTimeSlots(
            crewMember.id,
            dateStr,
            appointmentType.duration_minutes
          );

          if (slotsError) {
            console.error(
              `🔴 [QuickBooking] Error getting slots for ${crewMember.full_name}:`,
              slotsError
            );
            return [];
          }

          if (!availableSlots || availableSlots.length === 0) {
            console.log(
              `🟡 [QuickBooking] No available slots for ${crewMember.full_name} on ${dateStr} (needed ${appointmentType.duration_minutes} min continuous block)`
            );
            return [];
          }

          console.log(
            `✅ [QuickBooking] Found ${availableSlots.length} slots for ${crewMember.full_name} on ${dateStr}`
          );

          return availableSlots.map((slot, slotIndex) => ({
            id: `${crewMember.id}-${dateStr}-${slot.start_time}-${slotIndex}`,
            crew_member_id: crewMember.id,
            crew_member_name: crewMember.full_name || 'ספק ללא שם',
            crew_member_avatar: crewMember.avatar_url || '',
            appointment_type_id: appointmentType.id,
            appointment_type_name: appointmentType.name,
            duration_minutes: appointmentType.duration_minutes,
            price: appointmentType.price,
            appointment_date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
          }));
        })
      );

      allSlots.push(...slotResults.flat());

      // Stop searching if we have enough slots for quick booking
      if (allSlots.length >= 10) break;
    }

    // Filter out past slots and sort by date and time in Israel timezone
    const israelNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));

    const filteredSlots = allSlots.filter(slot => {
      // Parse slot time in Israel timezone context
      const slotDate = new Date(`${slot.appointment_date}T${slot.start_time}`);
      // Convert to UTC for comparison by getting the time in Israel timezone
      const slotDateInIsrael = new Date(slotDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      return slotDateInIsrael > israelNow;
    });

    const sortedSlots = filteredSlots.sort((a, b) => {
      // Compare dates and times directly as strings (ISO format works for this)
      const dateTimeA = `${a.appointment_date}T${a.start_time}`;
      const dateTimeB = `${b.appointment_date}T${b.start_time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

    const next5Slots = sortedSlots.slice(0, 5);

    console.log(
      '🟢 [QuickBooking] Found',
      next5Slots.length,
      'quick slots out of',
      allSlots.length,
      'total slots (after filtering past slots:',
      filteredSlots.length,
      ')'
    );
    return next5Slots;

  } catch (error) {
    console.error('🔴 [QuickBooking] Error fetching quick slots:', error);
    throw error;
  }
}

import { supabase } from '../../lib/supabase';

export interface BreakDate {
  id: string;
  crew_member_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch break dates for a specific crew member
 */
export async function fetchBreakDates(
  crewMemberId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: BreakDate[] | null; error: any }> {
  try {
    console.log('🔵 [BreakDates] Fetching break dates for crew member:', crewMemberId);

    let query = supabase
      .from('break_dates')
      .select('*')
      .eq('crew_member_id', crewMemberId)
      .order('start_date', { ascending: true });

    if (startDate) {
      query = query.gte('end_date', startDate);
    }
    if (endDate) {
      query = query.lte('start_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [BreakDates] Error fetching break dates:', error);
      return { data: null, error };
    }

    console.log('🟢 [BreakDates] Break dates fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Add a new break date (full day)
 */
export async function addBreakDate(
  crewMemberId: string,
  startDate: string,
  endDate: string,
  reason?: string
): Promise<{ data: BreakDate | null; error: any }> {
  try {
    console.log('🔵 [BreakDates] Adding break date:', { crewMemberId, startDate, endDate, reason });

    const { data, error } = await supabase
      .from('break_dates')
      .insert({
        crew_member_id: crewMemberId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [BreakDates] Error adding break date:', error);
      return { data: null, error };
    }

    console.log('🟢 [BreakDates] Break date added successfully');

    // Broadcast break date change to customers in booking flow
    try {
      await supabase
        .channel('break-hours-updates')
        .send({
          type: 'broadcast',
          event: 'break_dates_updated',
          payload: {
            crew_member_id: crewMemberId,
            start_date: startDate,
            end_date: endDate,
            break_id: data.id,
          },
        });
      console.log('📡 [BreakDates] Break date broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [BreakDates] Failed to broadcast break date update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    return { data, error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Add break hours for a specific date
 */
export async function addBreakHours(
  crewMemberId: string,
  date: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<{ data: BreakDate | null; error: any }> {
  try {
    console.log('🔵 [BreakDates] Adding break hours:', { crewMemberId, date, startTime, endTime, reason });

    const { data, error } = await supabase
      .from('break_dates')
      .insert({
        crew_member_id: crewMemberId,
        start_date: date,
        end_date: date, // Same day for break hours
        start_time: startTime,
        end_time: endTime,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [BreakDates] Error adding break hours:', error);
      return { data: null, error };
    }

    // Broadcast break hours change to customers in booking flow
    try {
      await supabase
        .channel('break-hours-updates')
        .send({
          type: 'broadcast',
          event: 'break_hours_added',
          payload: {
            crew_member_id: crewMemberId,
            date: date,
            start_time: startTime,
            end_time: endTime,
            break_id: data.id,
          },
        });
      console.log('📡 [BreakDates] Break hours broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [BreakDates] Failed to broadcast break hours update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    console.log('🟢 [BreakDates] Break hours added successfully');
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing break date
 */
export async function updateBreakDate(
  breakDateId: string,
  updates: Partial<Pick<BreakDate, 'start_date' | 'end_date' | 'start_time' | 'end_time' | 'reason'>>
): Promise<{ data: BreakDate | null; error: any }> {
  try {
    console.log('🔵 [BreakDates] Updating break date:', breakDateId, updates);

    const { data, error } = await supabase
      .from('break_dates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', breakDateId)
      .select()
      .single();

    if (error) {
      console.error('🔴 [BreakDates] Error updating break date:', error);
      return { data: null, error };
    }

    console.log('🟢 [BreakDates] Break date updated successfully');

    // Broadcast break date change to customers in booking flow
    try {
      await supabase
        .channel('break-hours-updates')
        .send({
          type: 'broadcast',
          event: 'break_dates_updated',
          payload: {
            crew_member_id: data.crew_member_id,
            start_date: data.start_date,
            end_date: data.end_date,
            break_id: data.id,
          },
        });
      console.log('📡 [BreakDates] Break date update broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [BreakDates] Failed to broadcast break date update:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    return { data, error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Delete a break date
 */
export async function deleteBreakDate(breakDateId: string): Promise<{ error: any }> {
  try {
    console.log('🔵 [BreakDates] Deleting break date:', breakDateId);

    // First get the break date info for broadcasting
    const { data: breakData } = await supabase
      .from('break_dates')
      .select('crew_member_id, start_date, end_date, start_time, end_time')
      .eq('id', breakDateId)
      .single();

    const { error } = await supabase
      .from('break_dates')
      .delete()
      .eq('id', breakDateId);

    if (error) {
      console.error('🔴 [BreakDates] Error deleting break date:', error);
      return { error };
    }

    // Broadcast break hours removal to customers in booking flow
    if (breakData) {
      try {
        await supabase
          .channel('break-hours-updates')
          .send({
            type: 'broadcast',
            event: 'break_hours_removed',
            payload: {
              crew_member_id: breakData.crew_member_id,
              date: breakData.start_date,
              start_time: breakData.start_time,
              end_time: breakData.end_time,
              break_id: breakDateId,
            },
          });
        console.log('📡 [BreakDates] Break hours removal broadcast sent successfully');
      } catch (broadcastError) {
        console.warn('⚠️ [BreakDates] Failed to broadcast break hours removal:', broadcastError);
        // Don't fail the operation if broadcast fails
      }
    }

    if (breakData) {
      try {
        await supabase
          .channel('break-hours-updates')
          .send({
            type: 'broadcast',
            event: 'break_dates_updated',
            payload: {
              crew_member_id: breakData.crew_member_id,
              start_date: breakData.start_date,
              end_date: breakData.end_date,
              break_id: breakDateId,
            },
          });
        console.log('📡 [BreakDates] Break date removal broadcast sent successfully');
      } catch (broadcastError) {
        console.warn('⚠️ [BreakDates] Failed to broadcast break date removal:', broadcastError);
        // Don't fail the operation if broadcast fails
      }
    }

    console.log('🟢 [BreakDates] Break date deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { error };
  }
}

/**
 * Check if a crew member is available on a specific date
 */
export async function checkAvailability(
  crewMemberId: string,
  date: string
): Promise<{ isAvailable: boolean; error: any }> {
  try {
    console.log('🔵 [BreakDates] Checking availability for:', crewMemberId, date);

    const { data, error } = await supabase
      .from('break_dates')
      .select('id')
      .eq('crew_member_id', crewMemberId)
      .lte('start_date', date)
      .gte('end_date', date);

    if (error) {
      console.error('🔴 [BreakDates] Error checking availability:', error);
      return { isAvailable: false, error };
    }

    const isAvailable = !data || data.length === 0;
    console.log('🟢 [BreakDates] Availability check completed:', isAvailable);
    return { isAvailable, error: null };
  } catch (error) {
    console.error('🔴 [BreakDates] Unexpected error:', error);
    return { isAvailable: false, error };
  }
}

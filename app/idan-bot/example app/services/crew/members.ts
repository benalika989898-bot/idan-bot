import { supabase } from '../../lib/supabase';
import { User } from '../../types/auth';

/**
 * Fetch all crew members
 */
export async function fetchCrewMembers(): Promise<{ data: User[] | null; error: any }> {
  try {
    console.log('🔵 [CrewMembers] Fetching crew members');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['crew', 'admin'])
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewMembers] Error fetching crew members:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewMembers] Crew members fetched successfully:', data?.length || 0);
    return { data: data as User[], error: null };
  } catch (error) {
    console.error('🔴 [CrewMembers] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch active crew members with their availability
 */
export async function fetchActiveCrewMembers(): Promise<{ data: User[] | null; error: any }> {
  try {
    console.log('🔵 [CrewMembers] Fetching active crew members');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['crew', 'admin'])
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewMembers] Error fetching active crew members:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewMembers] Active crew members fetched successfully:', data?.length || 0);
    return { data: data as User[], error: null };
  } catch (error) {
    console.error('🔴 [CrewMembers] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Get the slot interval for a specific crew member.
 * Defaults to 30 minutes if not set.
 */
export async function getCrewSlotInterval(crewMemberId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('slot_interval_minutes')
      .eq('id', crewMemberId)
      .single();

    if (error) {
      console.warn('⚠️ [CrewMembers] Falling back to default slot interval:', {
        crewMemberId,
        error,
      });
      return 30;
    }

    if (!error && data?.slot_interval_minutes) {
      return data.slot_interval_minutes;
    }

    return 30;
  } catch (error) {
    console.error('🔴 [CrewMembers] Unexpected error getting slot interval:', {
      crewMemberId,
      error,
    });
    return 30;
  }
}

/**
 * Update the slot interval for a specific crew member.
 */
export async function updateCrewSlotInterval(
  crewMemberId: string,
  minutes: number
): Promise<{ data: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ slot_interval_minutes: minutes, updated_at: new Date().toISOString() })
      .eq('id', crewMemberId);

    if (error) {
      return { data: false, error };
    }

    // Broadcast the change
    try {
      await supabase.channel('schedule-updates').send({
        type: 'broadcast',
        event: 'schedule_updated',
        payload: {
          crew_member_id: crewMemberId,
          operation: 'interval_update',
        },
      });
    } catch (broadcastError) {
      console.warn('⚠️ [CrewMembers] Failed to broadcast interval update:', broadcastError);
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error };
  }
}

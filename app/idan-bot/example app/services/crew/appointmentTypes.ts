import { supabase } from '../../lib/supabase';

/**
 * Fetch all appointment types
 */
export async function fetchAllAppointmentTypes(): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Fetching all appointment types');

    const { data, error } = await supabase
      .from('appointment_types')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        color,
        can_use_tickets,
        display_order,
        user_id,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error fetching appointment types:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment types fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointment types for a specific crew member
 */
export async function fetchAppointmentTypesByCrewMember(crewMemberId: string): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Fetching appointment types for crew member:', crewMemberId);

    const { data, error } = await supabase
      .from('appointment_types')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        color,
        can_use_tickets,
        display_order,
        user_id,
        created_at,
        updated_at
      `)
      .eq('user_id', crewMemberId)
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error fetching appointment types by crew member:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment types for crew member fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointment type by ID
 */
export async function fetchAppointmentTypeById(id: string): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Fetching appointment type by ID:', id);

    const { data, error } = await supabase
      .from('appointment_types')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        color,
        can_use_tickets,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error fetching appointment type by ID:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment type fetched successfully');
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointment types with price range filter
 */
export async function fetchAppointmentTypesByPriceRange(
  minPrice?: number,
  maxPrice?: number
): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Fetching appointment types by price range:', { minPrice, maxPrice });

    let query = supabase
      .from('appointment_types')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        color,
        can_use_tickets,
        created_at,
        updated_at
      `);

    if (minPrice !== undefined) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice !== undefined) {
      query = query.lte('price', maxPrice);
    }

    query = query.order('price', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error fetching appointment types by price range:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment types by price range fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Create a new appointment type
 */
export async function createAppointmentType(appointmentTypeData: {
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color?: string;
  can_use_tickets?: boolean;
  is_active: boolean;
  user_id?: string;
}): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Creating appointment type:', appointmentTypeData);

    // If no user_id provided, get it from current user
    let dataToInsert = appointmentTypeData;
    if (!appointmentTypeData.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        dataToInsert = { ...appointmentTypeData, user_id: user.id };
      }
    }

    const { data, error } = await supabase
      .from('appointment_types')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error creating appointment type:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment type created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing appointment type
 */
export async function updateAppointmentType(
  id: string,
  appointmentTypeData: {
    name: string;
    description?: string;
    duration_minutes: number;
    price?: number;
    color?: string;
    can_use_tickets?: boolean;
    is_active: boolean;
    user_id?: string;
  }
): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Updating appointment type:', id, appointmentTypeData);

    const { data, error } = await supabase
      .from('appointment_types')
      .update(appointmentTypeData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error updating appointment type:', error);
      return { data: null, error };
    }

    const updated = Array.isArray(data) ? data[0] : null;
    if (!updated) {
      const noRowError = {
        code: 'NO_ROWS',
        message: 'No rows updated. Check permissions or filters.',
      };
      console.error('🔴 [CrewAppointmentTypes] No rows updated:', noRowError);
      return { data: null, error: noRowError };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment type updated successfully:', updated);
    return { data: updated, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Delete an appointment type
 */
export async function deleteAppointmentType(id: string): Promise<{ error: any }> {
  try {
    console.log('🔵 [CrewAppointmentTypes] Deleting appointment type:', id);

    const { error } = await supabase.from('appointment_types').delete().eq('id', id);

    if (error) {
      console.error('🔴 [CrewAppointmentTypes] Error deleting appointment type:', error);
      return { error };
    }

    console.log('🟢 [CrewAppointmentTypes] Appointment type deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointmentTypes] Unexpected error:', error);
    return { error };
  }
}

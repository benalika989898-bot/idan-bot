import { supabase } from '@/lib/supabase';

export interface CustomerAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  appointment_type: {
    id: string;
    name: string;
    duration_minutes: number;
    price?: number;
    color?: string | null;
    can_use_tickets?: boolean;
  };
  crew_member: {
    id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

export const getCustomerAppointmentById = async (appointmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        appointment_date,
        start_time,
        end_time,
        created_at,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes,
          price,
          color,
          can_use_tickets
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url,
          phone
        )
      `
      )
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      return { data: null, error };
    }

    return { data: data as CustomerAppointment, error: null };
  } catch (error) {
    console.error('Unexpected error fetching appointment:', error);
    return { data: null, error };
  }
};

export const getUpcomingCustomerAppointments = async (customerId: string) => {
  try {
    // Get today's date in Israel timezone
    const now = new Date();
    const israelTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const today = israelTime; // Already in YYYY-MM-DD format

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        appointment_date,
        start_time,
        end_time,
        created_at,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes,
          price,
          color,
          can_use_tickets
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url,
          phone
        )
      `
      )
      .eq('customer_id', customerId)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Additional filtering to ensure we only show truly upcoming appointments
    const filteredData = data?.filter(appointment => {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      return appointmentDateTime.getTime() > now.getTime();
    });

    if (error) {
      console.error('Error fetching upcoming appointments:', error);
      return { data: null, error };
    }

    return { data: (filteredData || []) as CustomerAppointment[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching upcoming appointments:', error);
    return { data: null, error };
  }
};

export const cancelAppointment = async (appointmentId: string) => {
  try {
    console.log('🔵 [CustomerAppointments] Cancelling appointment:', appointmentId);

    // First get the appointment details for broadcasting
    const { data: appointmentData, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        *,
        customer:profiles!customer_id (
          id,
          full_name,
          phone,
          avatar_url,
          role
        ),
        crew_member:profiles!crew_member_id (
          id,
          full_name,
          phone,
          avatar_url,
          role
        ),
        appointment_type:appointment_types (
          id,
          name,
          description,
          duration_minutes,
          price,
          color,
          can_use_tickets
        )
      `
      )
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointmentData) {
      console.error('🔴 [CustomerAppointments] Error fetching appointment for cancellation:', fetchError);
      return { error: fetchError };
    }

    // Delete the appointment
    const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);

    if (error) {
      console.error('🔴 [CustomerAppointments] Error cancelling appointment:', error);
      return { error };
    }

    // Broadcast appointment cancellation to crew members
    try {
      const channel = supabase.channel(`crew-appointments-${appointmentData.crew_member_id}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'appointment_cancelled',
        payload: {
          appointment_id: appointmentId,
          crew_member_id: appointmentData.crew_member_id,
          appointment_date: appointmentData.appointment_date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          customer_name: appointmentData.customer?.full_name,
          appointment_type_name: appointmentData.appointment_type?.name,
          reason: 'Customer cancellation',
        },
      });
      
      console.log('📡 [CustomerAppointments] Appointment cancellation broadcast sent successfully');
    } catch (broadcastError) {
      console.warn('⚠️ [CustomerAppointments] Failed to broadcast appointment cancellation:', broadcastError);
      // Don't fail the operation if broadcast fails
    }

    try {
      const analyticsChannel = supabase.channel('analytics-updates');
      await analyticsChannel.send({
        type: 'broadcast',
        event: 'analytics_updated',
        payload: {
          type: 'appointment_cancelled',
          appointment_id: appointmentId,
          crew_member_id: appointmentData.crew_member_id,
          appointment_date: appointmentData.appointment_date,
        },
      });
    } catch (broadcastError) {
      console.warn('⚠️ [CustomerAppointments] Failed to broadcast analytics update:', broadcastError);
    }

    console.log('🟢 [CustomerAppointments] Appointment cancelled successfully');
    return { error: null };
  } catch (error) {
    console.error('🔴 [CustomerAppointments] Unexpected error cancelling appointment:', error);
    return { error };
  }
};

export const canCancelAppointment = (appointmentDate: string, startTime: string): boolean => {
  const now = new Date();
  const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
  const diffInHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return diffInHours > 2;
};

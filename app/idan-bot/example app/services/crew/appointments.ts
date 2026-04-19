import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Appointment, AppointmentFilters } from '../../types/appointments';
import { canUseTicketForAppointment } from './tickets';
import { BreakDate, fetchBreakDates } from './breakDates';
import { timeToMinutes } from '../../utils/dateUtils';

type AppointmentHistoryOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Create a new appointment
 */
export interface CreateAppointmentData {
  appointment_type_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  crew_member_id: string;
  customer_id?: string;
  customer_name?: string;
  notes?: string;
  use_ticket?: boolean;
  payment_type?: 'cash' | 'ticket';
  ignore_breaks?: boolean;
}

/**
 * Validate that the appointment time doesn't conflict with break hours
 */
async function validateAppointmentTime(
  crewMemberId: string,
  appointmentDate: string,
  startTime: string,
  endTime: string
): Promise<{ isValid: boolean; error?: any }> {
  try {
    // Check for break hours on the appointment date
    const { data: breakHours, error: breakError } = await fetchBreakDates(
      crewMemberId,
      appointmentDate,
      appointmentDate
    );

    if (breakError) {
      console.error('🔴 [Validation] Error fetching break hours:', breakError);
      return { isValid: false, error: breakError };
    }

    // Filter to only breaks with specific times
    const timeBreaks = breakHours?.filter((brk) => brk.start_time && brk.end_time) || [];

    // Check for overlaps with break hours
    const appointmentStart = timeToMinutes(startTime);
    const appointmentEnd = timeToMinutes(endTime);

    for (const breakHour of timeBreaks) {
      const breakStart = timeToMinutes(breakHour.start_time!);
      const breakEnd = timeToMinutes(breakHour.end_time!);

      // Check if appointment overlaps with break
      if (appointmentStart < breakEnd && appointmentEnd > breakStart) {
        console.log(
          `🚫 [Validation] Appointment ${startTime}-${endTime} conflicts with break ${breakHour.start_time}-${breakHour.end_time}`
        );

        return {
          isValid: false,
          error: {
            code: 'BREAK_CONFLICT',
            message: 'השעה הזו מתנגשת עם הפסקה. אנא בחר שעה אחרת.',
            userFriendly: true,
          },
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('🔴 [Validation] Error validating appointment time:', error);
    return { isValid: false, error };
  }
}

async function canAppointmentUseTickets(
  appointmentTypeId: string
): Promise<{ allowed: boolean; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('appointment_types')
      .select('can_use_tickets')
      .eq('id', appointmentTypeId)
      .single();

    if (error) {
      return { allowed: true, error };
    }

    return { allowed: data?.can_use_tickets ?? true };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Error checking ticket eligibility:', error);
    return { allowed: true, error };
  }
}

export async function createAppointment(
  appointmentData: CreateAppointmentData
): Promise<{ data: Appointment | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Creating appointment:', appointmentData);

    if (!appointmentData.ignore_breaks) {
      // Validate that appointment doesn't conflict with break hours
      const validation = await validateAppointmentTime(
        appointmentData.crew_member_id,
        appointmentData.appointment_date,
        appointmentData.start_time,
        appointmentData.end_time
      );

      if (!validation.isValid) {
        console.log('🚫 [CrewAppointments] Appointment validation failed:', validation.error);
        return { data: null, error: validation.error };
      }
    }

    // Prepare appointment data without use_ticket field for DB insert
    let { use_ticket, ignore_breaks, ...dbAppointmentData } = appointmentData;
    let shouldUseTicket = use_ticket;

    if (use_ticket) {
      const { allowed } = await canAppointmentUseTickets(appointmentData.appointment_type_id);
      if (!allowed) {
        shouldUseTicket = false;
      }
    }

    if (!dbAppointmentData.payment_type) {
      dbAppointmentData.payment_type = shouldUseTicket ? 'ticket' : 'cash';
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([dbAppointmentData])
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
      .single();

    if (error) {
      console.error('🔴 [CrewAppointments] Error creating appointment:', error);

      // Create user-friendly error for React Query
      let userError = error;

      // Handle specific constraint violations with user-friendly messages
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('appointments_crew_time_unique')) {
          userError = {
            ...error,
            message: 'השעה הזו כבר תפוסה. אנא בחר שעה אחרת.',
            userFriendly: true,
          };
        }
      }

      // Handle overlap trigger errors (PostgreSQL function errors have code P0001)
      if (error.code === 'P0001' || error.message?.includes('overlaps with existing appointment')) {
        userError = {
          ...error,
          message: 'השעה הזו מתנגשת עם תור קיים. אנא בחר שעה אחרת.',
          userFriendly: true,
        };
      }

      return { data: null, error: userError };
    }

    const appointment = data as Appointment;

    // Fallback: ensure ticket usage if payment type is ticket.
    if (shouldUseTicket && appointmentData.customer_id) {
      try {
        await supabase.rpc('use_ticket_for_appointment', {
          customer_uuid: appointmentData.customer_id,
          appointment_uuid: appointment.id,
          crew_member_uuid: appointmentData.crew_member_id,
        });
      } catch (ticketError) {
        console.warn('⚠️ [CrewAppointments] Ticket usage fallback failed:', ticketError);
      }
    }

    // Broadcast appointment creation to crew members on their specific channels
    try {
      // Send to all possible dashboard channels for this crew member and date
      const channel = supabase.channel(`crew-appointments-${appointment.crew_member_id}`);

      await channel.send({
        type: 'broadcast',
        event: 'appointment_booked',
        payload: {
          appointment_id: appointment.id,
          crew_member_id: appointment.crew_member_id,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          customer_name: appointment.customer?.full_name,
          appointment_type_name: appointment.appointment_type?.name,
        },
      });

      console.log('📡 [CrewAppointments] Appointment booking broadcast sent successfully');
    } catch (broadcastError) {
      console.warn(
        '⚠️ [CrewAppointments] Failed to broadcast appointment booking:',
        broadcastError
      );
      // Don't fail the operation if broadcast fails
    }

    try {
      const analyticsChannel = supabase.channel('analytics-updates');
      await analyticsChannel.send({
        type: 'broadcast',
        event: 'analytics_updated',
        payload: {
          type: 'appointment_booked',
          appointment_id: appointment.id,
          crew_member_id: appointment.crew_member_id,
          appointment_date: appointment.appointment_date,
        },
      });
    } catch (broadcastError) {
      console.warn('⚠️ [CrewAppointments] Failed to broadcast analytics update:', broadcastError);
    }

    console.log('🟢 [CrewAppointments] Appointment created successfully');
    return { data: appointment, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointments for a specific crew member on a selected date
 */
export async function fetchAppointmentsByDate(
  crewMemberId: string,
  date: string
): Promise<{ data: Appointment[] | null; error: any }> {
  try {
    const { data, error } = await supabase
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
      .eq('crew_member_id', crewMemberId)
      .eq('appointment_date', date)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('🔴 [CrewAppointments] Error fetching appointments:', error);
      return { data: null, error };
    }

    return { data: data as Appointment[], error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointments for a crew member with flexible filters
 */
export async function fetchAppointments(
  filters: AppointmentFilters
): Promise<{ data: Appointment[] | null; error: any }> {
  try {
    let query = supabase.from('appointments').select(`
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
      `);

    // Apply filters
    if (filters.crew_member_id) {
      query = query.eq('crew_member_id', filters.crew_member_id);
    }

    if (filters.date) {
      query = query.eq('appointment_date', filters.date);
    }

    // Status field doesn't exist in appointments table

    if (filters.service_type) {
      query = query.eq('appointment_type_id', filters.service_type);
    }

    // Default ordering by date and time
    query = query
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [CrewAppointments] Error fetching appointments:', error);
      return { data: null, error };
    }

    return { data: data as Appointment[], error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<{ data: Appointment | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Cancelling appointment:', { appointmentId, reason });

    // First get the appointment details for notification
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
          role,
          expo_push_token
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
      console.error(
        '🔴 [CrewAppointments] Error fetching appointment for cancellation:',
        fetchError
      );
      return { data: null, error: fetchError };
    }

    // First, store crew cancellation notification BEFORE deleting appointment
    console.log('🟡 [CrewAppointments] About to insert crew cancellation notification:', {
      appointmentId,
      customerId: appointmentData.customer_id,
      reason,
      appointmentData: {
        crew_member_id: appointmentData.crew_member_id,
        appointment_date: appointmentData.appointment_date,
        start_time: appointmentData.start_time,
        appointment_type_name: appointmentData.appointment_type?.name,
        customer_name: appointmentData.customer?.full_name,
      },
    });

    // Try to queue notification for crew cancellation (non-blocking)
    try {
      console.log('🟡 [CrewAppointments] Attempting to queue cancellation notification...');

      const insertResult = await supabase.from('notification_queue').insert({
        notification_type: 'booking_cancelled',
        appointment_id: appointmentId,
        crew_member_id: appointmentData.crew_member_id,
        customer_id: appointmentData.customer_id,
        appointment_date: appointmentData.appointment_date,
        start_time: appointmentData.start_time,
        appointment_type_name: appointmentData.appointment_type?.name || '',
        customer_name: appointmentData.customer?.full_name || '',
        cancellation_reason: reason || 'ללא סיבה',
        error_message: 'CREW_CANCELLED', // Just a marker to identify crew cancellations
      });

      if (insertResult.error) {
        console.error('🔴 [CrewAppointments] Insert error details:', insertResult.error);

        // Check if it's an RLS policy error
        if (insertResult.error.code === '42501') {
          console.warn(
            '⚠️ [CrewAppointments] RLS policy blocks notification insert - this is expected for some users. Continuing with cancellation.'
          );
        }
      } else {
        console.log('✅ [CrewAppointments] Crew cancellation notification queued successfully');
      }
    } catch (notificationError) {
      console.error(
        '🔴 [CrewAppointments] Exception queueing crew cancellation notification:',
        notificationError
      );

      // Check if it's an RLS policy error
      if (
        notificationError &&
        typeof notificationError === 'object' &&
        'code' in notificationError &&
        notificationError.code === '42501'
      ) {
        console.warn(
          '⚠️ [CrewAppointments] RLS policy prevents notification insert - continuing with cancellation anyway.'
        );
      }

      // Don't fail the cancellation if notification fails - this is non-critical
    }

    // Now delete the appointment (this will cascade and delete the notification)
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
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
      .single();

    if (error) {
      console.error('🔴 [CrewAppointments] Error cancelling appointment:', error);
      return { data: null, error };
    }

    // Broadcast appointment cancellation to crew members on their specific channels
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
          reason: reason || '',
        },
      });

      console.log('📡 [CrewAppointments] Appointment cancellation broadcast sent successfully');
    } catch (broadcastError) {
      console.warn(
        '⚠️ [CrewAppointments] Failed to broadcast appointment cancellation:',
        broadcastError
      );
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
      console.warn('⚠️ [CrewAppointments] Failed to broadcast analytics update:', broadcastError);
    }

    console.log('🟢 [CrewAppointments] Appointment cancelled successfully');
    return { data: data as Appointment, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Cancel an appointment permanently by setting status to 'cancelled'.
 * The appointment remains in the database and blocks the time slot.
 */
export async function cancelAppointmentPermanent(
  appointmentId: string,
  reason?: string
): Promise<{ data: Appointment | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: (reason || 'ללא סיבה').replace(/[\n\r]/g, ' '),
      })
      .eq('id', appointmentId)
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
      .single();

    if (error) {
      console.error('🔴 [CrewAppointments] Error permanently cancelling appointment:', error);
      return { data: null, error };
    }

    try {
      const channel = supabase.channel(`crew-appointments-${data.crew_member_id}`);
      await channel.send({
        type: 'broadcast',
        event: 'appointment_cancelled',
        payload: {
          appointment_id: appointmentId,
          crew_member_id: data.crew_member_id,
          appointment_date: data.appointment_date,
        },
      });
    } catch (broadcastError) {
      console.warn('⚠️ [CrewAppointments] Failed to broadcast:', broadcastError);
    }

    return { data: data as Appointment, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointments for a specific customer
 */
export async function fetchCustomerAppointments(
  customerId: string,
  options?: AppointmentHistoryOptions
): Promise<{ data: Appointment[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Fetching appointments for customer:', customerId);
    let query = supabase
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
      .eq('customer_id', customerId)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (typeof options?.limit === 'number') {
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [CrewAppointments] Error fetching customer appointments:', error);
      return { data: null, error };
    }

    console.log(
      '🟢 [CrewAppointments] Customer appointments fetched successfully:',
      data?.length || 0
    );
    return { data: data as Appointment[], error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch upcoming appointments for a crew member (from today onwards)
 */
export async function fetchUpcomingAppointments(
  crewMemberId: string,
  limit?: number
): Promise<{ data: Appointment[] | null; error: any }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    console.log('🔵 [CrewAppointments] Fetching upcoming appointments for:', {
      crewMemberId,
      today,
      limit,
    });

    let query = supabase
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
      .eq('crew_member_id', crewMemberId)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [CrewAppointments] Error fetching upcoming appointments:', error);
      return { data: null, error };
    }

    console.log(
      '🟢 [CrewAppointments] Upcoming appointments fetched successfully:',
      data?.length || 0
    );
    return { data: data as Appointment[], error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Create appointment with ticket handling
 */
export async function createAppointmentWithTickets(
  appointmentData: CreateAppointmentData
): Promise<{ data: Appointment | null; error: any; usedTicket?: boolean }> {
  console.log('🔵 [CrewAppointments] Creating appointment with ticket handling');

  let useTicket = false;

  // Respect explicit ticket choice when provided, otherwise fall back to automatic behavior.
  if (appointmentData.customer_id) {
    const { allowed } = await canAppointmentUseTickets(appointmentData.appointment_type_id);
    if (allowed) {
      const { canUse } = await canUseTicketForAppointment(
        appointmentData.customer_id,
        appointmentData.crew_member_id
      );
      useTicket = appointmentData.use_ticket ?? canUse;

      if (useTicket && canUse) {
        console.log(
          '🟡 [CrewAppointments] Customer has tickets, will use one for this appointment'
        );
      }
    }
  }

  // Create appointment with ticket usage flag
  const result = await createAppointment({
    ...appointmentData,
    use_ticket: useTicket,
  });

  if (result.error) {
    console.error('🔴 [CrewAppointments] Error creating appointment with tickets:', result.error);
    return { data: null, error: result.error, usedTicket: useTicket };
  }

  return {
    ...result,
    usedTicket: useTicket,
  };
}

/**
 * Update appointment date/time
 */
export async function updateAppointmentTime(
  appointmentId: string,
  updates: { appointment_date: string; start_time: string; end_time: string }
): Promise<{ data: Appointment | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Updating appointment time:', appointmentId, updates);

    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        customer_id,
        crew_member_id,
        appointment_date,
        start_time,
        end_time,
        customer:profiles!customer_id (
          full_name
        ),
        appointment_type:appointment_types (
          name
        )
      `
      )
      .eq('id', appointmentId)
      .single();

    if (fetchError || !currentAppointment) {
      console.error('🔴 [CrewAppointments] Error fetching appointment before update:', fetchError);
      return { data: null, error: fetchError };
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select(
        `
        *,
        customer:profiles!customer_id (
          full_name
        ),
        appointment_type:appointment_types (
          name
        )
      `
      )
      .single();

    if (error) {
      console.error('🔴 [CrewAppointments] Error updating appointment time:', error);
      return { data: null, error };
    }

    // Queue customer reschedule notification (non-blocking)
    try {
      if (data.customer_id) {
        const insertResult = await supabase.from('notification_queue').insert({
          notification_type: 'booking_rescheduled',
          appointment_id: data.id,
          crew_member_id: data.crew_member_id,
          customer_id: data.customer_id,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          appointment_type_name: data.appointment_type?.name || '',
          customer_name: data.customer?.full_name || '',
          error_message: 'CREW_RESCHEDULED',
        });

        if (insertResult.error) {
          console.warn(
            '⚠️ [CrewAppointments] Failed to queue reschedule notification',
            insertResult.error
          );
        }
      }
    } catch (notificationError) {
      console.warn(
        '⚠️ [CrewAppointments] Failed to queue reschedule notification',
        notificationError
      );
    }

    // Broadcast availability updates (cancel old slot, book new slot)
    try {
      const channel = supabase.channel(`crew-appointments-${currentAppointment.crew_member_id}`);

      await channel.send({
        type: 'broadcast',
        event: 'appointment_cancelled',
        payload: {
          appointment_id: currentAppointment.id,
          crew_member_id: currentAppointment.crew_member_id,
          appointment_date: currentAppointment.appointment_date,
          start_time: currentAppointment.start_time,
          end_time: currentAppointment.end_time,
          customer_name: currentAppointment.customer?.full_name,
          appointment_type_name: currentAppointment.appointment_type?.name,
          reason: 'rescheduled',
        },
      });

      await channel.send({
        type: 'broadcast',
        event: 'appointment_booked',
        payload: {
          appointment_id: data.id,
          crew_member_id: data.crew_member_id,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          end_time: data.end_time,
          customer_name: data.customer?.full_name,
          appointment_type_name: data.appointment_type?.name,
        },
      });

      console.log('📡 [CrewAppointments] Appointment reschedule broadcasts sent successfully');
    } catch (broadcastError) {
      console.warn(
        '⚠️ [CrewAppointments] Failed to broadcast appointment reschedule:',
        broadcastError
      );
    }

    console.log('🟢 [CrewAppointments] Appointment time updated successfully');
    return { data: data as Appointment, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error updating appointment time:', error);
    return { data: null, error };
  }
}

/**
 * Fetch both appointments and break hours for a specific date
 */
export type ScheduleItem =
  | {
      type: 'appointment';
      data: Appointment;
      time: string;
    }
  | {
      type: 'break';
      data: BreakDate;
      time: string;
    };

export type ScheduleRangeItem =
  | {
      type: 'appointment';
      data: Appointment;
      date: string;
      startTime: string;
      endTime: string;
    }
  | {
      type: 'break';
      data: BreakDate;
      date: string;
      startTime: string;
      endTime: string;
    };

export async function fetchScheduleByDate(
  crewMemberId: string,
  date: string
): Promise<{ data: ScheduleItem[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Fetching schedule for date:', date);

    // Fetch both appointments and break hours in parallel
    const [appointmentsResponse, breaksResponse] = await Promise.all([
      fetchAppointmentsByDate(crewMemberId, date),
      fetchBreakDates(crewMemberId, date, date),
    ]);

    if (appointmentsResponse.error) {
      console.error(
        '🔴 [CrewAppointments] Error fetching appointments:',
        appointmentsResponse.error
      );
      return { data: null, error: appointmentsResponse.error };
    }

    if (breaksResponse.error) {
      console.error('🔴 [CrewAppointments] Error fetching breaks:', breaksResponse.error);
      return { data: null, error: breaksResponse.error };
    }

    const appointments = appointmentsResponse.data || [];
    const breaks = breaksResponse.data || [];

    // Convert to schedule items with time for sorting
    const scheduleItems: ScheduleItem[] = [
      ...appointments.map(
        (appointment): ScheduleItem => ({
          type: 'appointment',
          data: appointment,
          time: appointment.start_time,
        })
      ),
      ...breaks
        .filter((breakItem) => breakItem.start_time) // Only include breaks with specific times
        .map(
          (breakItem): ScheduleItem => ({
            type: 'break',
            data: breakItem,
            time: breakItem.start_time!,
          })
        ),
    ];

    // Sort by time
    scheduleItems.sort((a, b) => a.time.localeCompare(b.time));

    console.log(
      '🟢 [CrewAppointments] Schedule fetched successfully:',
      scheduleItems.length,
      'items'
    );
    return { data: scheduleItems, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch appointments and timed breaks for a date range
 */
export async function fetchScheduleByRange(
  crewMemberId: string,
  startDate: string,
  endDate: string
): Promise<{ data: ScheduleRangeItem[] | null; error: any }> {
  try {
    console.log('🔵 [CrewAppointments] Fetching schedule range:', { startDate, endDate });

    const [appointmentsResponse, breaksResponse] = await Promise.all([
      supabase
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
        .eq('crew_member_id', crewMemberId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true }),
      fetchBreakDates(crewMemberId, startDate, endDate),
    ]);

    if (appointmentsResponse.error) {
      console.error(
        '🔴 [CrewAppointments] Error fetching appointments range:',
        appointmentsResponse.error
      );
      return { data: null, error: appointmentsResponse.error };
    }

    if (breaksResponse.error) {
      console.error('🔴 [CrewAppointments] Error fetching breaks range:', breaksResponse.error);
      return { data: null, error: breaksResponse.error };
    }

    const appointments = (appointmentsResponse.data as Appointment[]) || [];
    const breaks = breaksResponse.data || [];

    const rangeStart = dayjs(startDate);
    const rangeEnd = dayjs(endDate);

    const appointmentItems: ScheduleRangeItem[] = appointments.map((appointment) => ({
      type: 'appointment',
      data: appointment,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
    }));

    const breakItems: ScheduleRangeItem[] = breaks
      .filter((breakItem) => breakItem.start_time && breakItem.end_time)
      .flatMap((breakItem) => {
        const start = dayjs(breakItem.start_date);
        const end = dayjs(breakItem.end_date);
        const items: ScheduleRangeItem[] = [];

        let current = start;
        while (current.isBefore(end) || current.isSame(end, 'day')) {
          if (
            (current.isAfter(rangeStart) || current.isSame(rangeStart, 'day')) &&
            (current.isBefore(rangeEnd) || current.isSame(rangeEnd, 'day'))
          ) {
            items.push({
              type: 'break',
              data: breakItem,
              date: current.format('YYYY-MM-DD'),
              startTime: breakItem.start_time!,
              endTime: breakItem.end_time!,
            });
          }
          current = current.add(1, 'day');
        }

        return items;
      });

    const scheduleItems = [...appointmentItems, ...breakItems];
    scheduleItems.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    console.log('🟢 [CrewAppointments] Schedule range fetched:', scheduleItems.length, 'items');
    return { data: scheduleItems, error: null };
  } catch (error) {
    console.error('🔴 [CrewAppointments] Unexpected error fetching range:', error);
    return { data: null, error };
  }
}

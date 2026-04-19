import { supabase } from '@/lib/supabase';

export type SwapRequestStatus = 'pending' | 'accepted' | 'declined';

export interface SwapAppointmentSummary {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: {
    id: string;
    name: string;
    duration_minutes: number;
  };
  crew_member: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  customer?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface SwapRequestDetails {
  id: string;
  status: SwapRequestStatus;
  requester_id: string;
  recipient_id: string;
  requester_appointment: SwapAppointmentSummary;
  recipient_appointment: SwapAppointmentSummary;
  created_at: string;
}

export interface SwapRequestListItem {
  id: string;
  status: SwapRequestStatus;
  requester_id: string;
  recipient_id: string;
  requester_appointment: SwapAppointmentSummary;
  recipient_appointment: SwapAppointmentSummary;
  created_at: string;
}

export interface CrewSwapRequestItem {
  id: string;
  status: SwapRequestStatus;
  created_at: string;
  requester_appointment: SwapAppointmentSummary;
  recipient_appointment: SwapAppointmentSummary;
}

export interface SwapCandidateAppointment {
  id: string;
  start_time: string;
  end_time: string;
  customer: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

type ServiceResult<T> = {
  data: T | null;
  error: any;
};

export async function createSwapRequest(params: {
  requesterAppointmentId: string;
  recipientAppointmentId: string;
  recipientId: string;
  requesterId: string;
}): Promise<ServiceResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('appointment_swap_requests')
    .insert({
      requester_id: params.requesterId,
      requester_appointment_id: params.requesterAppointmentId,
      recipient_appointment_id: params.recipientAppointmentId,
      recipient_id: params.recipientId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as { id: string }, error: null };
}

export async function fetchSwapRequestDetails(
  requestId: string
): Promise<ServiceResult<SwapRequestDetails>> {
  const { data, error } = await supabase
    .from('appointment_swap_requests')
    .select(
      `
      id,
      status,
      requester_id,
      recipient_id,
      created_at,
      requester_appointment:appointments!appointment_swap_requests_requester_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        customer:profiles!appointments_customer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      ),
      recipient_appointment:appointments!appointment_swap_requests_recipient_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        customer:profiles!appointments_customer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('id', requestId)
    .single();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error('Swap request not found') };
  }

  return { data: data as unknown as SwapRequestDetails, error: null };
}

export async function getSwapRequestsForUser(
  userId: string
): Promise<ServiceResult<SwapRequestListItem[]>> {
  const { data, error } = await supabase
    .from('appointment_swap_requests')
    .select(
      `
      id,
      status,
      requester_id,
      recipient_id,
      created_at,
      requester_appointment:appointments!appointment_swap_requests_requester_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        )
      ),
      recipient_appointment:appointments!appointment_swap_requests_recipient_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error };
  }

  return { data: (data || []) as unknown as SwapRequestListItem[], error: null };
}

export async function getSwapRequestsForCrew(params: {
  crewMemberId: string;
  isAdmin: boolean;
}): Promise<ServiceResult<CrewSwapRequestItem[]>> {
  let query = supabase
    .from('appointment_swap_requests')
    .select(
      `
      id,
      status,
      created_at,
      requester_appointment:appointments!appointment_swap_requests_requester_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        customer:profiles!appointments_customer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      ),
      recipient_appointment:appointments!appointment_swap_requests_recipient_appointment_id_fkey(
        id,
        appointment_date,
        start_time,
        end_time,
        appointment_type:appointment_types(
          id,
          name,
          duration_minutes
        ),
        crew_member:profiles!appointments_crew_member_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        customer:profiles!appointments_customer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(30);

  if (!params.isAdmin) {
    query = query.or(
      `requester_id.eq.${params.crewMemberId},recipient_id.eq.${params.crewMemberId}`
    );
  }

  const { data, error } = await query;
  if (error) {
    return { data: null, error };
  }

  return { data: (data || []) as unknown as CrewSwapRequestItem[], error: null };
}

export async function getSwapCandidates(params: {
  crewMemberId: string;
  appointmentDate: string;
  appointmentTypeId: string;
  excludeAppointmentId: string;
}): Promise<ServiceResult<SwapCandidateAppointment[]>> {
  // Get current time in Israel timezone to filter out past appointments
  const now = new Date();
  const israelTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jerusalem', hour12: false });
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const isToday = params.appointmentDate === today;

  let query = supabase
    .from('appointments')
    .select(
      `
      id,
      start_time,
      end_time,
      customer:profiles!appointments_customer_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('crew_member_id', params.crewMemberId)
    .eq('appointment_date', params.appointmentDate)
    .eq('appointment_type_id', params.appointmentTypeId)
    .not('id', 'eq', params.excludeAppointmentId)
    .not('customer_id', 'is', null)
    .order('start_time', { ascending: true });

  if (isToday) {
    query = query.gt('start_time', israelTime);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  return { data: (data || []) as unknown as SwapCandidateAppointment[], error: null };
}

export async function acceptSwapRequest(requestId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('accept_appointment_swap', {
    request_id: requestId,
  });
  if (error) {
    return { data: null, error };
  }

  return { data: null, error: null };
}

export async function declineSwapRequest(requestId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('appointment_swap_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) {
    return { data: null, error };
  }

  return { data: null, error: null };
}

export async function sendSwapNotification(params: {
  requestId: string;
  type: 'request' | 'response';
  status?: SwapRequestStatus;
}): Promise<ServiceResult<any>> {
  const { data, error } = await supabase.functions.invoke('appointment-swap-notifications', {
    body: {
      requestId: params.requestId,
      type: params.type,
      status: params.status,
    },
  });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

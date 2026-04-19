import { supabase } from '@/lib/supabase';

export type CrewNotificationType = 'booking_created' | 'booking_cancelled' | 'swap_accepted';

export interface CrewNotificationItem {
  id: string;
  type: CrewNotificationType;
  created_at: string;
  appointment_date: string;
  start_time: string;
  other_appointment_date?: string | null;
  other_start_time?: string | null;
  appointment_type_name: string;
  customer_name?: string | null;
  customer_avatar_url?: string | null;
  requester_customer_name?: string | null;
  requester_customer_avatar_url?: string | null;
  recipient_customer_name?: string | null;
  recipient_customer_avatar_url?: string | null;
  crew_member_id?: string | null;
  crew_member_name?: string | null;
  crew_member_avatar_url?: string | null;
}

export async function getCrewNotificationsCount({
  userId,
  isAdmin,
  since,
}: {
  userId: string;
  isAdmin: boolean;
  since?: string;
}) {
  let query = supabase.from('crew_notifications').select('*', { count: 'exact', head: true });

  if (!isAdmin) {
    query = query.eq('crew_member_id', userId);
  }

  if (since) {
    query = query.gt('created_at', since);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getCrewNotifications({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  let query = supabase
    .from('crew_notifications')
    .select(
      `
      id,
      event_type,
      created_at,
      appointment_date,
      start_time,
      other_appointment_date,
      other_start_time,
      appointment_type_name,
      customer_name,
      customer:profiles!crew_notifications_customer_id_fkey(
        id,
        full_name,
        avatar_url
      ),
      other_customer:profiles!crew_notifications_other_customer_id_fkey(
        id,
        full_name,
        avatar_url
      ),
      crew_member_id,
      crew_member:profiles!crew_notifications_crew_member_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(30);

  if (!isAdmin) {
    query = query.eq('crew_member_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id,
    type: item.event_type as CrewNotificationType,
    created_at: item.created_at,
    appointment_date: item.appointment_date,
    start_time: item.start_time,
    other_appointment_date: item.other_appointment_date,
    other_start_time: item.other_start_time,
    appointment_type_name: item.appointment_type_name || 'תור',
    customer_name: item.customer_name || item.customer?.full_name || null,
    customer_avatar_url: item.customer?.avatar_url || null,
    requester_customer_name: item.customer?.full_name || item.customer_name || null,
    requester_customer_avatar_url: item.customer?.avatar_url || null,
    recipient_customer_name: item.other_customer?.full_name || item.other_customer_name || null,
    recipient_customer_avatar_url: item.other_customer?.avatar_url || null,
    crew_member_id: item.crew_member_id,
    crew_member_name: item.crew_member?.full_name || null,
    crew_member_avatar_url: item.crew_member?.avatar_url || null,
  })) as CrewNotificationItem[];
}

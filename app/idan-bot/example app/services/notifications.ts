import { supabase } from '@/lib/supabase';

export interface CustomerMessage {
  id: string;
  title: string | null;
  content: string | null;
  crew_member_id: string | null;
  send_to_all: boolean;
  target_customer_id: string | null;
  created_at: string;
  crew_member: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface CancellationNotification {
  id: string;
  appointment_date: string;
  start_time: string;
  appointment_type_name: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface AllNotifications {
  messages: CustomerMessage[];
  cancellations: CancellationNotification[];
}

export async function fetchAllNotifications(userId: string): Promise<AllNotifications> {
  const [messagesRes, cancellationsRes] = await Promise.all([
    supabase
      .from('customer_messages')
      .select(`
        id,
        title,
        content,
        crew_member_id,
        send_to_all,
        target_customer_id,
        created_at,
        crew_member:profiles!crew_member_id(
          id,
          full_name
        )
      `)
      .or(`send_to_all.eq.true,target_customer_id.eq.${userId}`)
      .order('created_at', { ascending: false }),

    supabase
      .from('notification_queue')
      .select(`
        id,
        appointment_date,
        start_time,
        appointment_type_name,
        cancellation_reason,
        created_at
      `)
      .eq('customer_id', userId)
      .eq('error_message', 'CREW_CANCELLED')
      .order('created_at', { ascending: false }),
  ]);

  if (messagesRes.error) {
    console.error('[Notifications] Error fetching customer messages:', messagesRes.error);
  }
  if (cancellationsRes.error) {
    console.error('[Notifications] Error fetching cancellations:', cancellationsRes.error);
  }

  return {
    messages: (messagesRes.data ?? []) as unknown as CustomerMessage[],
    cancellations: (cancellationsRes.data ?? []) as CancellationNotification[],
  };
}

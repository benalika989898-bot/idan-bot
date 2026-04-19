import { supabase } from '../../lib/supabase';

export interface CreateMessageData {
  title: string;
  content: string;
  crew_member_id: string;
}

/**
 * Send a message to all customers
 * This will create a customer_messages record that triggers push notifications
 */
export async function sendMessageToAllCustomers(messageData: CreateMessageData): Promise<{ data: any | null; error: any }> {
  try {
    console.log('🔵 [CrewMessages] Sending message to all customers');
    
    // Debug: Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 [CrewMessages] Current user:', user?.id, 'Crew member ID:', messageData.crew_member_id);

    const { data, error } = await supabase
      .from('customer_messages')
      .insert({
        title: messageData.title,
        content: messageData.content,
        crew_member_id: messageData.crew_member_id,
        send_to_all: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [CrewMessages] Error sending message:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewMessages] Message sent successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewMessages] Unexpected error:', error);
    return { data: null, error };
  }
}

/**
 * Fetch all sent messages
 */
export async function fetchSentMessages(): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔵 [CrewMessages] Fetching sent messages');

    const { data, error } = await supabase
      .from('customer_messages')
      .select(`
        *,
        crew_member:profiles!crew_member_id(
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [CrewMessages] Error fetching messages:', error);
      return { data: null, error };
    }

    console.log('🟢 [CrewMessages] Messages fetched successfully:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('🔴 [CrewMessages] Unexpected error:', error);
    return { data: null, error };
  }
}
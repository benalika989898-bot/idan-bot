import { supabase } from '@/lib/supabase';

interface PushNotificationMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
}

/**
 * Send push notification to a specific user by their user ID
 */
export async function sendPushNotificationToUser(
  userId: string, 
  message: PushNotificationMessage
): Promise<boolean> {
  try {
    // Get user's expo push token from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.expo_push_token) {
      console.error('❌ No expo push token found for user:', userId);
      return false;
    }

    return await sendPushNotificationToToken(profile.expo_push_token, message);
  } catch (error) {
    console.error('❌ Error sending push notification to user:', error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[], 
  message: PushNotificationMessage
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  // Process notifications in parallel for better performance
  const promises = userIds.map(async (userId) => {
    const success = await sendPushNotificationToUser(userId, message);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  });

  await Promise.all(promises);
  
  console.log(`📊 Push notifications sent: ${successful} successful, ${failed} failed`);
  return { successful, failed };
}

/**
 * Send push notification to users with specific role
 */
export async function sendPushNotificationToRole(
  role: 'customer' | 'crew' | 'admin',
  message: PushNotificationMessage
): Promise<{ successful: number; failed: number }> {
  try {
    // Get all users with the specified role who have expo push tokens
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', role)
      .not('expo_push_token', 'is', null);

    if (error) {
      console.error('❌ Error fetching users by role:', error);
      return { successful: 0, failed: 0 };
    }

    const userIds = profiles?.map(p => p.id) || [];
    return await sendPushNotificationToUsers(userIds, message);
  } catch (error) {
    console.error('❌ Error sending push notifications to role:', error);
    return { successful: 0, failed: 0 };
  }
}

/**
 * Send push notification directly to an expo push token
 */
export async function sendPushNotificationToToken(
  expoPushToken: string,
  message: PushNotificationMessage
): Promise<boolean> {
  try {
    const payload = {
      to: expoPushToken,
      sound: message.sound || 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (response.ok && result.data?.status === 'ok') {
      console.log('✅ Push notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send push notification:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return false;
  }
}

/**
 * Push notification templates for common app events
 */
export const notificationTemplates = {
  appointmentReminder: (appointmentDetails: { time: string; serviceName: string }) => ({
    title: 'תזכורת תור',
    body: `התור שלך ל${appointmentDetails.serviceName} בשעה ${appointmentDetails.time}`,
    data: { type: 'appointment_reminder' },
  }),

  appointmentConfirmed: (appointmentDetails: { time: string; serviceName: string }) => ({
    title: 'התור אושר',
    body: `התור שלך ל${appointmentDetails.serviceName} בשעה ${appointmentDetails.time} אושר`,
    data: { type: 'appointment_confirmed' },
  }),

  appointmentCancelled: (appointmentDetails: { time: string; serviceName: string }) => ({
    title: 'התור בוטל',
    body: `התור שלך ל${appointmentDetails.serviceName} בשעה ${appointmentDetails.time} בוטל`,
    data: { type: 'appointment_cancelled' },
  }),

  newAppointmentForCrew: (appointmentDetails: { customerName: string; time: string; serviceName: string }) => ({
    title: 'תור חדש נקבע',
    body: `תור חדש של ${appointmentDetails.customerName} ל${appointmentDetails.serviceName} בשעה ${appointmentDetails.time}`,
    data: { type: 'new_appointment' },
  }),
};
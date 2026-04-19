import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { useQueryClient } from '@tanstack/react-query';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleRegistrationError(errorMessage: string) {
  console.error('Push notification registration error:', errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log('✅ Expo push token obtained:', pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      const errorMessage = `${e}`;
      handleRegistrationError(errorMessage);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

async function updateExpoPushTokenInSupabase(userId: string, expoPushToken: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: expoPushToken })
      .eq('id', userId);

    if (error) {
      console.error('Error updating expo push token:', error);
      throw error;
    }

    console.log('✅ Successfully updated expo push token in database');
  } catch (error) {
    console.error('❌ Failed to update expo push token:', error);
    throw error;
  }
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const setupPushNotifications = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          // Update the token in Supabase
          await updateExpoPushTokenInSupabase(user.id, token);
        } else {
          console.log('📱 Push notifications not available on this platform/environment');
        }
      } catch (error: any) {
        console.error('Failed to setup push notifications:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    setupPushNotifications();

    // Clear badge when app opens
    Notifications.setBadgeCountAsync(0);

    // Clear badge when app returns from background
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Notifications.setBadgeCountAsync(0);
      }
    });

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      setNotification(notification);
      const data = notification.request.content.data as {
        type?: string;
        swapRequestId?: string;
        status?: string;
      };

      if (data?.type === 'appointment_swap_request') {
        queryClient.invalidateQueries({ queryKey: ['swap-requests', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests-count', user?.id] });
      }

      if (data?.type === 'appointment_swap_response') {
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests-count', user?.id] });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response:', response);
      const data = response.notification.request.content.data as {
        type?: string;
        swapRequestId?: string;
        status?: string;
      };

      if (data?.type === 'appointment_swap_request' && data.swapRequestId) {
        router.push({
          pathname: '/(modal)/swap-request',
          params: { requestId: data.swapRequestId },
        });
        queryClient.invalidateQueries({ queryKey: ['swap-requests', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests-count', user?.id] });
      }

      if (data?.type === 'appointment_swap_response') {
        const message =
          data.status === 'accepted' ? 'בקשת ההחלפה התקבלה' : 'בקשת ההחלפה נדחתה';
        toast.info(message);
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['swap-requests-count', user?.id] });
      }
    });

    return () => {
      subscription.remove();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [queryClient, user?.id]);

  const sendTestNotification = async () => {
    if (!expoPushToken) {
      console.error('No expo push token available');
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'Test Notification',
      body: 'This is a test notification from your app!',
      data: { test: true },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Test notification sent:', result);
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  return {
    expoPushToken,
    notification,
    isLoading,
    error,
    sendTestNotification,
    updateToken: updateExpoPushTokenInSupabase,
  };
};

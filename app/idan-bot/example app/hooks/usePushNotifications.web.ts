import { useState } from 'react';

export const usePushNotifications = () => {
  const [expoPushToken] = useState<string>('');

  return {
    expoPushToken,
    notification: undefined,
    isLoading: false,
    error: null,
    sendTestNotification: async () => {},
    updateToken: async () => {},
  };
};

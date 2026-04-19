import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Component to automatically set up push notifications when user is authenticated
 * Should be mounted once in the app root
 */
function PushNotificationSetupInner() {
  const { error } = usePushNotifications();

  useEffect(() => {
    if (error) {
      console.error('Push notification setup failed:', error);
    }
  }, [error]);

  // This component doesn't render anything
  return null;
}

export const PushNotificationSetup = ({ enabled = true }: { enabled?: boolean }) => {
  if (!enabled) {
    return null;
  }

  return <PushNotificationSetupInner />;
};

export default PushNotificationSetup;

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Test component for push notifications - can be added temporarily to any screen for testing
 * Remove this component in production
 */
export const PushNotificationTest = () => {
  const { expoPushToken, sendTestNotification, isLoading, error } = usePushNotifications();

  return (
    <View className="bg-gray-100 p-4 m-4 rounded-lg border border-gray-200">
      <Text className="text-lg font-bold text-center mb-2">🔔 Push Notification Test</Text>
      
      {isLoading && <Text className="text-center text-gray-600">Setting up notifications...</Text>}
      
      {error && (
        <Text className="text-center text-red-500 text-sm mb-2">
          Error: {error}
        </Text>
      )}
      
      {expoPushToken ? (
        <View>
          <Text className="text-xs text-gray-600 text-center mb-2">
            Token: {expoPushToken.slice(0, 20)}...
          </Text>
          <Pressable
            onPress={sendTestNotification}
            className="bg-blue-500 py-2 px-4 rounded-lg">
            <Text className="text-white text-center font-medium">
              Send Test Notification
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text className="text-center text-gray-500">
          No push token available
        </Text>
      )}
    </View>
  );
};

export default PushNotificationTest;
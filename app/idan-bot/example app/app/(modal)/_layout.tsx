import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="actions"
        options={{
          headerShown: false,

          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="customer-book-appointment"
        options={{
          headerShown: false,
          headerShadowVisible: false,
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="swap-appointment"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="swap-request"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-customer"
        options={{
          title: 'הוספת לקוח',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'פעולות',
          animation: 'fade',
          animationDuration: 150,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="book-appointment"
        options={{
          headerShown: false,
          title: 'קביעת תור ללקוח',
          presentation: 'card',
          contentStyle: { backgroundColor: 'white' },
        }}
      />
      <Stack.Screen
        name="calendar-book-appointment"
        options={{
          headerShown: false,
          title: 'קביעת תור',
          presentation: 'card',
          contentStyle: { backgroundColor: 'white' },
        }}
      />

      <Stack.Screen
        name="edit-schedule"
        options={{
          headerShown: true,
          contentStyle: { backgroundColor: 'white' },
          title: 'עריכת לו״ז',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="p-2">
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="select-customer"
        options={{ headerShown: true, presentation: 'modal', title: 'בחירת לקוח' }}
      />
      <Stack.Screen
        name="send-message"
        options={{
          title: 'שליחת הודעה ללקוחות',
          presentation: 'card',
          contentStyle: { backgroundColor: 'white' },
        }}
      />
    </Stack>
  );
}

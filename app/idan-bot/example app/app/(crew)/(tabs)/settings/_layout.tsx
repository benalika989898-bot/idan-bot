import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerShadowVisible: true,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'הגדרות',
          headerLargeTitle: false,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          contentStyle: { backgroundColor: 'white' },
          title: 'עריכת זמנים',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="media"
        options={{
          title: 'ניהול תמונות',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="booking-settings"
        options={{
          title: 'מרווח זמן',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="social"
        options={{
          title: 'רשתות חברתיות',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="about-text"
        options={{
          title: 'טקסט אודות',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="crew-order"
        options={{
          title: 'סדר אנשי צוות',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="message-board"
        options={{
          title: 'לוח הודעות',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="appointment-types"
        options={{
          title: 'סוגי טיפולים',
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="appointment-types/order"
        options={{
          title: 'סדר סוגי טיפולים',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="break-dates"
        options={{
          title: 'תאריכי חופש',
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

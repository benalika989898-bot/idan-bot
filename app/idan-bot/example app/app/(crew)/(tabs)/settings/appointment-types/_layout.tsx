import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'סוגי טיפולים',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'הוספת סוג טיפול',
        }}
      />
      <Stack.Screen
        name="order"
        options={{
          title: 'סדר סוגי טיפולים',
        }}
      />
    </Stack>
  );
}

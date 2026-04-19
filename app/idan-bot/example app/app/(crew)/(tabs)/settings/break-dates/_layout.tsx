import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'החופשים שלי',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'הוספת תאריך חופשה',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

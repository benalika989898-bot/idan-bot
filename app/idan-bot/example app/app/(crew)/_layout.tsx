import { Stack } from 'expo-router';

export default function CrewLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sell-products"
        options={{
          presentation: 'modal',
          headerShadowVisible: false,
          headerShown: false,
          headerTitle: 'מכירת מוצרים',
        }}
      />
      <Stack.Screen
        name="add-break-hours"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'הוספת שעות הפסקה',
          contentStyle: { backgroundColor: 'white' },
        }}
      />
    </Stack>
  );
}

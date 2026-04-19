import { Stack } from 'expo-router';

export default function AddMemberLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'הוספת לקוח' }} />
      <Stack.Screen name="pick-contact" options={{ title: 'בחירה מאנשי קשר' }} />
    </Stack>
  );
}

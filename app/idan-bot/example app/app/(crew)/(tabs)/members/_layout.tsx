import { Stack } from 'expo-router';

export default function MembersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'לקוחות' }} />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'פרטי לקוח',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerShown: true,
          title: 'הוספת לקוח',
          headerTitleAlign: 'center',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-member"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="add-tickets" options={{ headerShown: true, title: 'הוספת כרטיסים' }} />
    </Stack>
  );
}

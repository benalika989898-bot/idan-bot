import { Stack } from 'expo-router';

export default function ProductsLayout() {
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
          title: 'מוצרים',
          headerLargeTitle: false,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'הוספת מוצר',
          headerShadowVisible: false,
          headerBackground: () => null,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'עריכת מוצר',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

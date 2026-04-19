import { useSellProductsStore } from '@/stores/sellProductsStore';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function SellProductsLayout() {
  const { appointmentId, customerName } = useLocalSearchParams<{
    appointmentId: string;
    customerName: string;
  }>();

  const setContext = useSellProductsStore((s) => s.setContext);
  const reset = useSellProductsStore((s) => s.reset);

  useEffect(() => {
    if (appointmentId && customerName) {
      setContext(appointmentId, customerName);
    }
    return () => {
      reset();
    };
  }, [appointmentId, customerName]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: customerName ? `מכירת מוצרים - ${customerName}` : 'מכירת מוצרים',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="cart"
        options={{
          title: 'סיכום הזמנה',
          headerShadowVisible: false,
          headerBackTitle: 'חזרה',
        }}
      />
    </Stack>
  );
}

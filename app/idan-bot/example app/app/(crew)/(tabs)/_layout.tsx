import { useAuth } from '@/contexts/AuthContext';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  const { user } = useAuth();

  // Only show products tab for admin role (owner permission)
  const showProductsTab = user?.role === 'admin';

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>הגדרות</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="members">
        <NativeTabs.Trigger.Label>לקוחות</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>
      {showProductsTab && (
        <NativeTabs.Trigger name="products">
          <NativeTabs.Trigger.Label>מוצרים</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="cube.box.fill" md="inventory_2" />
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>רווחים</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>לו״ז</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="today" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { fetchActiveCrewMembers } from '@/services/crew/members';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function MembersLayout() {
  const { data: crewMembers } = useQuery({
    queryKey: ['activeCrewMembers'],
    queryFn: async () => {
      const { data, error } = await fetchActiveCrewMembers();
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const crewCount = crewMembers?.length ?? 0;
  const crewSwitcherDetent = Math.min(0.85, Math.max(0.3, 0.15 + crewCount * 0.1));

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="[appointment-id]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [Platform.OS === 'ios' ? 0.52 : 0.5],
          contentStyle: { flex: 1, backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="crew-switcher"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [crewSwitcherDetent],
          contentStyle: { flex: 1, backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="break/[break-id]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [Platform.OS === 'ios' ? 0.3 : 0.5],
          contentStyle: { flex: 1, backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule-create"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.48],
          contentStyle: { flex: 1, backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule-action"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [Platform.OS === 'ios' ? 0.42 : 0.5],
          contentStyle: { flex: 1, backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule-empty"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [Platform.OS === 'ios' ? 0.42 : 0.5],
          contentStyle: { flex: 1, backgroundColor: 'transparent', padding: 0 },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="waiting-list"
        options={{
          title: 'רשימת המתנה',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

import { useAuth } from '@/contexts/AuthContext';
import { fetchCrewMembers, updateCrewSlotInterval } from '@/services/crew/members';
import { ChipGroup } from '@/shared/ui/molecules/animated-chip/Chip';
import { User } from '@/types/auth';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const intervalOptions = [10, 15, 20, 30, 45, 60];

export default function BookingSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const pagerRef = useRef<PagerView>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [localIntervals, setLocalIntervals] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Admin sees all crew members, non-admin sees only themselves
  const { data: crewMembers, isLoading } = useQuery<User[]>({
    queryKey: ['crewMembersProfiles'],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await fetchCrewMembers();
        if (error) throw error;
        return data ?? [];
      }
      // Non-admin: just use the current user
      return user ? [user] : [];
    },
  });

  const members: User[] = Array.isArray(crewMembers) ? crewMembers : [];

  useEffect(() => {
    if (members.length === 0) return;
    const intervals: Record<string, number> = {};
    for (const m of members) {
      intervals[m.id] = m.slot_interval_minutes ?? 30;
    }
    setLocalIntervals(intervals);
    setHasChanges(false);
  }, [crewMembers]);

  const handleIntervalChange = (memberId: string, minutes: number) => {
    const updated = { ...localIntervals, [memberId]: minutes };
    setLocalIntervals(updated);
    const changed = members.some((m) => updated[m.id] !== (m.slot_interval_minutes ?? 30));
    setHasChanges(changed);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const promises = members
        .filter((m) => localIntervals[m.id] !== (m.slot_interval_minutes ?? 30))
        .map((m) => updateCrewSlotInterval(m.id, localIntervals[m.id]));
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('המרווח עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['crewMembersProfiles'] });
      for (const m of members) {
        queryClient.invalidateQueries({ queryKey: ['crewSlotInterval', m.id] });
      }
      setHasChanges(false);
    },
    onError: () => {
      toast.error('שגיאה בעדכון המרווח');
    },
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        const disabled = !hasChanges || mutation.isPending;
        return (
          <Pressable onPress={() => mutation.mutate()} disabled={disabled}>
            <Text
              className={`px-4 text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
              {mutation.isPending ? 'שומר...' : 'שמירה'}
            </Text>
          </Pressable>
        );
      },
    });
  }, [navigation, hasChanges, mutation.isPending]);

  const chips = members.map((member) => ({
    label: member.full_name || 'חבר צוות',
    activeColor: '#111827',
    labelColor: '#ffffff',
    inActiveBackgroundColor: '#f3f4f6',
    icon: () =>
      member.avatar_url ? (
        <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={{ uri: member.avatar_url }}
            style={{ width: 32, height: 32, borderRadius: 999 }}
            transition={200}
            contentFit="cover"
          />
        </View>
      ) : (
        <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={18} color="#111827" />
        </View>
      ),
  }));

  const handleChipPress = (index: number) => {
    setCurrentPageIndex(index);
    pagerRef.current?.setPage(index);
  };

  if (isLoading || !crewMembers) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">אין אנשי צוות להצגה</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        layoutDirection="rtl"
        onPageSelected={(event) => setCurrentPageIndex(event.nativeEvent.position)}
        orientation="horizontal">
        {members.map((member) => (
          <View key={member.id} className="flex-1" collapsable={false}>
            <ScrollView
              style={{ direction: 'rtl' }}
              className="flex-1 bg-gray-50"
              showsVerticalScrollIndicator={false}>
              <View className="gap-4 p-6">
                <View className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <View className="border-b border-gray-100 px-4 py-3">
                    <Text className="text-left text-base font-medium text-gray-900">
                      מרווח בין תורים
                    </Text>
                    <Text className="text-left text-sm text-gray-500">
                      כל כמה דקות ייווצרו חלונות זמן פנויים להזמנה
                    </Text>
                  </View>
                  <Picker
                    selectedValue={localIntervals[member.id] ?? 30}
                    onValueChange={(itemValue) => handleIntervalChange(member.id, itemValue)}
                    itemStyle={{ color: '#111827' }}>
                    {intervalOptions.map((minutes) => (
                      <Picker.Item key={minutes} label={`${minutes} דקות`} value={minutes} color="#111827" />
                    ))}
                  </Picker>
                </View>

                <View className="rounded-lg bg-blue-50 p-4">
                  <View className="flex-row gap-2">
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color="#007AFF"
                      style={{ marginRight: 8 }}
                    />
                    <View className="flex-1 gap-2">
                      <Text
                        className="text-left text-sm font-medium text-blue-800"
                        style={{ direction: 'rtl' }}>
                        מה זה מרווח זמן?
                      </Text>
                      <Text className="text-left text-xs text-blue-600">
                        {
                          '• המרווח קובע כל כמה דקות יווצרו חלונות זמן חדשים\n• מרווח של 30 דקות מתאים לרוב הטיפולים\n• מרווח קטן יותר נותן גמישות רבה יותר ללקוחות\n• מרווח גדול יותר מקל על ניהול הלו״ז'
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        ))}
      </PagerView>

      {members.length > 1 && (
        <View
          pointerEvents="box-none"
          style={{ bottom: insets.bottom / 2 }}
          className="absolute left-0 right-0 items-center px-4">
          <View className="max-w-full rounded-full bg-white/95 px-3 py-2 shadow-sm">
            <ChipGroup
              chips={chips}
              selectedIndex={currentPageIndex}
              onChange={handleChipPress}
              containerStyle={{ flexDirection: 'row-reverse' }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchActiveCrewMembers } from '@/services/crew/members';
import { useCrewCalendarStore } from '@/stores/crewCalendarStore';
import { User } from '@/types/auth';

const CrewSwitcherScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { crewMemberId: crewMemberIdParam } = useLocalSearchParams<{
    crewMemberId?: string | string[];
  }>();
  const selectedCrewMemberId = Array.isArray(crewMemberIdParam)
    ? crewMemberIdParam[0]
    : crewMemberIdParam;
  const { selectedCrewMemberId: storedCrewMemberId, setSelectedCrew } = useCrewCalendarStore();
  const activeCrewMemberId = storedCrewMemberId || selectedCrewMemberId;

  const cachedCrew = (queryClient.getQueryData(['activeCrewMembers']) as User[]) || [];
  const { data: crewMembers = cachedCrew } = useQuery<User[]>({
    queryKey: ['activeCrewMembers'],
    queryFn: async () => {
      const { data, error } = await fetchActiveCrewMembers();
      if (error) throw error;
      return data || [];
    },
    enabled: user?.role === 'admin',
    initialData: cachedCrew,
    staleTime: 1000 * 60 * 5,
  });
  const effectiveCrewMembers = crewMembers.length ? crewMembers : cachedCrew;

  React.useEffect(() => {
    if (user?.role !== 'admin') return;
    queryClient.prefetchQuery({
      queryKey: ['activeCrewMembers'],
      queryFn: async () => {
        const { data, error } = await fetchActiveCrewMembers();
        if (error) throw error;
        return data || [];
      },
    });
  }, [queryClient, user?.role]);

  if (user?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">אין הרשאה לצפות ביומנים אחרים</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center p-4">
      <View className="rounded-3xl bg-white px-6 pb-8 pt-4 shadow-lg">
        <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
        <Text className="text-center text-base font-semibold text-slate-900">בחירת יומן</Text>
        <Text className="mt-1 text-center text-sm text-slate-500">
          בחר/י חבר צוות כדי לצפות בלו״ז שלו
        </Text>

        {effectiveCrewMembers.length === 0 ? (
          <View className="mt-6 items-center">
            <Text className="text-sm text-slate-500">לא נמצאו אנשי צוות</Text>
          </View>
        ) : (
          <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-2">
              {effectiveCrewMembers.map((member) => {
                const isSelected = member.id === activeCrewMemberId;
                const initials =
                  member.full_name
                    ?.split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('') || 'י';
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      setSelectedCrew({
                        id: member.id,
                        name: member.full_name || undefined,
                        avatarUrl: member.avatar_url || undefined,
                      });
                      router.back();
                    }}
                    className={`flex-row items-center justify-between rounded-2xl border px-3 py-3 ${
                      isSelected ? 'border-black bg-black/5' : 'border-slate-200 bg-white'
                    }`}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <View className="flex-row items-center gap-2">
                      <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                        {member.avatar_url ? (
                          <Image
                            source={{ uri: member.avatar_url }}
                            contentFit="cover"
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                          />
                        ) : (
                          <Text className="text-xs font-semibold text-slate-700">{initials}</Text>
                        )}
                      </View>
                      <View>
                        <Text className="text-right text-sm font-semibold text-slate-900">
                          {member.full_name || 'ללא שם'}
                        </Text>
                        <Text className="text-left text-xs text-slate-500">
                          {member.role === 'admin' ? 'בעלים' : 'צוות'}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-black">
                        <FontAwesome6 name="check" size={12} color="#fff" />
                      </View>
                    ) : (
                      <View className="h-8 w-8 items-center justify-center rounded-full border border-slate-200">
                        <FontAwesome6 name="chevron-left" size={12} color="#94a3b8" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default CrewSwitcherScreen;

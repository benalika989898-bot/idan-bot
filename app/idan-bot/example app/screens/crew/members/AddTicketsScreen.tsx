import { FontAwesome6 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useAuth } from '@/contexts/AuthContext';
import { fetchCrewMembers } from '@/services/crew/members';
import { fetchCustomerProfile } from '@/services/crew/profiles';
import {
  getCustomerTicketBalanceForScope,
  setCustomerTicketBalance,
} from '@/services/crew/tickets';
import { formatPhoneNumber } from '@/utils/formatPhoneNumber';
import { toast } from 'sonner-native';

const AddTicketsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id: profileIdParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(profileIdParam) ? profileIdParam[0] : profileIdParam;

  const isAdmin = user?.role === 'admin';
  const isCrew = user?.role === 'crew';

  const [balanceInput, setBalanceInput] = useState('');
  const [balanceSynced, setBalanceSynced] = useState(false);
  const [addAmountInput, setAddAmountInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [note, setNote] = useState('');
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['customerProfile', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await fetchCustomerProfile(profileId);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: crewMembers, isLoading: isLoadingCrewMembers } = useQuery({
    queryKey: ['crewMembersProfiles'],
    queryFn: async () => {
      const { data: crewData, error } = await fetchCrewMembers();
      if (error) throw error;
      return crewData || [];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const crewMembersList = Array.isArray(crewMembers) ? crewMembers : [];

  useEffect(() => {
    if (user?.id && !selectedCrewMemberId) {
      setSelectedCrewMemberId(user.id);
    }
  }, [selectedCrewMemberId, user?.id]);

  const effectiveCrewMemberId = useMemo(() => {
    if (!user?.id) return '';
    return isAdmin ? selectedCrewMemberId || user.id : user.id;
  }, [isAdmin, selectedCrewMemberId, user?.id]);

  const { data: scopedBalance = 0, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['customer-tickets-scope', profileId, effectiveCrewMemberId],
    queryFn: async () => {
      if (!profileId) return 0;
      const { data: balance, error } = await getCustomerTicketBalanceForScope(
        profileId,
        effectiveCrewMemberId
      );
      if (error) throw error;
      return balance || 0;
    },
    enabled: !!profileId && !!user?.id && !!effectiveCrewMemberId,
    staleTime: 5 * 60 * 1000,
  });

  const currentBalance =
    typeof scopedBalance === 'number' ? scopedBalance : Number(scopedBalance) || 0;

  // Sync balance input once when data loads or crew member changes
  useEffect(() => {
    if (!effectiveCrewMemberId) return;
    setBalanceInput(String(currentBalance));
    setBalanceSynced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCrewMemberId, isLoadingBalance]);

  const parsedBalance = parseInt(balanceInput, 10);
  const newBalance = isNaN(parsedBalance) ? currentBalance : parsedBalance;
  const addAmount = parseInt(addAmountInput, 10);
  const safeAddAmount = isNaN(addAmount) || addAmount <= 0 ? 0 : addAmount;
  const totalNewBalance = newBalance + safeAddAmount;
  const diff = totalNewBalance - currentBalance;

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('Missing profile id');
      if (!user?.id) throw new Error('Missing user');
      if (diff === 0) throw new Error('No change');

      const { error } = await setCustomerTicketBalance({
        customerId: profileId,
        crewMemberId: effectiveCrewMemberId,
        newBalance: totalNewBalance,
        adjustedBy: user.id,
        reason: note || undefined,
        ...(diff > 0 && priceInput ? { price: Number(priceInput) } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הכרטיסים נוספו בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['customer-tickets', profileId] });
      queryClient.invalidateQueries({
        queryKey: ['customer-tickets-scope', profileId, effectiveCrewMemberId],
      });
      router.back();
    },
    onError: (error: any) => {
      console.error('Error granting tickets:', error);
      toast.error('שגיאה בהוספת כרטיסים');
    },
  });

  const isAdding = diff > 0;
  const isSubmitDisabled =
    !effectiveCrewMemberId ||
    !balanceSynced ||
    diff === 0 ||
    (isAdding && (!priceInput || isNaN(Number(priceInput))));

  const handleSave = () => {
    if (isSubmitDisabled) {
      toast.error('אנא הזן כמות ומחיר');
      return;
    }
    grantMutation.mutate();
  };

  const SaveButton = () => {
    const disabled = isSubmitDisabled || grantMutation.isPending;
    return (
      <Pressable onPress={handleSave} disabled={disabled}>
        <Text className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {grantMutation.isPending ? 'שומר...' : 'שמור'}
        </Text>
      </Pressable>
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <SaveButton />,
    });
  }, [grantMutation.isPending, isSubmitDisabled]);

  if (!profileId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-gray-500">לא נמצא לקוח</Text>
      </View>
    );
  }

  if (isCrew) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
        <Text className="text-base text-gray-500">אין הרשאה לניהול כרטיסים</Text>
        <Pressable onPress={() => router.back()} className="rounded-full bg-black px-6 py-3">
          <Text className="text-base font-medium text-white">חזרה</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <KeyboardAwareScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bottomOffset={40}>
          {/* Profile */}
          <View className="items-center gap-1 px-6 py-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-900">
              <Text className="text-xl font-semibold text-white">
                {data?.full_name?.charAt(0) || 'ל'}
              </Text>
            </View>
            <Text className="text-lg font-semibold text-gray-900">
              {data?.full_name || 'ללא שם'}
            </Text>
            <Text className="text-sm text-gray-400">
              {data?.phone ? formatPhoneNumber(data.phone) : 'ללא מספר'}
            </Text>
          </View>

          {/* Crew Selector (admin only) */}
          {isAdmin && (
            <>
              <View className="px-6">
                <View className="h-px bg-gray-100" />
              </View>
              <View className="gap-2 px-6 py-4">
                <Text className="text-left text-xs font-medium text-gray-500">שיוך כרטיסים</Text>
                <View className="overflow-hidden rounded-lg bg-gray-50">
                  <Pressable
                    onPress={() => user?.id && setSelectedCrewMemberId(user.id)}
                    className={`flex-row items-center justify-between px-4 py-3 ${
                      selectedCrewMemberId === user?.id ? 'bg-gray-100' : ''
                    }`}>
                    <Text className="text-left text-sm text-gray-900">כרטיסי מנהל (לכל הצוות)</Text>
                    {selectedCrewMemberId === user?.id && (
                      <FontAwesome6 name="check" size={12} color="#111827" />
                    )}
                  </Pressable>
                  {isLoadingCrewMembers ? (
                    <View className="px-4 py-3">
                      <ActivityIndicator size="small" color="#111827" />
                    </View>
                  ) : (
                    crewMembersList
                      .filter((member) => member.role === 'crew')
                      .map((member) => (
                        <Pressable
                          key={member.id}
                          onPress={() => setSelectedCrewMemberId(member.id)}
                          className={`flex-row items-center justify-between px-4 py-3 ${
                            selectedCrewMemberId === member.id ? 'bg-gray-100' : ''
                          }`}>
                          <Text className="text-left text-sm text-gray-900">
                            {member.full_name || 'ללא שם'}
                          </Text>
                          {selectedCrewMemberId === member.id && (
                            <FontAwesome6 name="check" size={12} color="#111827" />
                          )}
                        </Pressable>
                      ))
                  )}
                </View>
              </View>
            </>
          )}

          <View className="px-6">
            <View className="h-px bg-gray-100" />
          </View>

          {/* Current Balance — editable */}
          <View className="items-center gap-2 px-6 py-5">
            <Text className="text-sm text-gray-400">
              {isAdmin
                ? selectedCrewMemberId === user?.id
                  ? 'כרטיסי מנהל'
                  : 'כרטיסים לצוות נבחר'
                : 'כרטיסים'}
            </Text>
            {isLoadingBalance ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <TextInput
                value={balanceInput}
                onChangeText={(text) => setBalanceInput(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                className="w-full text-center text-4xl font-bold text-gray-900"
                selectTextOnFocus
              />
            )}
            {newBalance !== currentBalance && (
              <Text
                className={`text-sm font-semibold ${newBalance > currentBalance ? 'text-green-600' : 'text-red-500'}`}>
                {newBalance > currentBalance ? '+' : ''}
                {newBalance - currentBalance} מהיתרה הנוכחית ({currentBalance})
              </Text>
            )}
          </View>

          <View className="px-6">
            <View className="h-px bg-gray-100" />
          </View>

          {/* Add Amount */}
          <View className="gap-2 px-6 py-4">
            <Text className="text-left text-xs font-medium text-gray-500">כמות כרטיסים להוספה</Text>
            <TextInput
              value={addAmountInput}
              onChangeText={(text) => setAddAmountInput(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              className="rounded-lg bg-gray-50 px-4 py-3 text-right  font-semibold text-gray-900"
              placeholder="1"
              placeholderTextColor="#9ca3af"
              selectTextOnFocus
            />
            {diff > 0 && (
              <Text className="text-left text-sm font-semibold text-green-600">
                יתרה חדשה: {totalNewBalance} (עבור {diff} כרטיסים)
              </Text>
            )}
          </View>

          <View className="px-6">
            <View className="h-px bg-gray-100" />
          </View>

          {/* Price + Note */}
          <View className="gap-4 px-6 py-4">
            {isAdding && (
              <View className="gap-2">
                <Text className="text-left text-xs font-medium text-gray-500">
                  מחיר (עבור {diff} כרטיסים)
                </Text>
                <TextInput
                  value={priceInput}
                  onChangeText={setPriceInput}
                  className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
                  keyboardType="decimal-pad"
                  placeholder="לדוגמה: 300"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View className="gap-2">
              <Text className="text-left text-xs font-medium text-gray-500">הערה (אופציונלי)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                className="rounded-lg bg-gray-50 px-4 py-3 text-right text-sm text-gray-900"
                placeholder="לדוגמה: חבילת 5"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}
    </>
  );
};

export default AddTicketsScreen;

import { useAuth } from '@/contexts/AuthContext';
import { bulkCreateCustomerProfiles, createCustomerProfile } from '@/services/crew/profiles';
import { getAndroidTopInset } from '@/utils/androidInsets';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { usePickedContact } from './pickedContactStore';

export default function AddMemberScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const pickedContacts = usePickedContact((s) => s.contacts);
  const clearPicked = usePickedContact((s) => s.clear);

  const batchCreateMutation = useMutation({
    mutationFn: async (contacts: { name: string; phone: string }[]) => {
      if (!user || (user.role !== 'admin' && user.role !== 'crew')) {
        throw new Error('אין הרשאה להוסיף לקוח');
      }

      const customers = contacts.map((c) => ({
        full_name: c.name.trim(),
        phone: c.phone.replace(/[^0-9+]/g, ''),
      }));

      return bulkCreateCustomerProfiles(customers);
    },
    onSuccess: ({ successCount, skippedCount, failCount }) => {
      if (successCount > 0) {
        toast.success(`${successCount} לקוחות נוספו בהצלחה`);
      }
      if (skippedCount > 0) {
        toast(`${skippedCount} לקוחות כבר קיימים במערכת`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} לקוחות לא נוספו`);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      router.back();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'שגיאה בהוספת הלקוחות');
    },
  });

  useEffect(() => {
    if (pickedContacts.length === 0) return;

    const contacts = [...pickedContacts];
    clearPicked();
    batchCreateMutation.mutate(contacts);
  }, [pickedContacts]);

  const normalizedPhone = useMemo(() => phone.replace(/[^0-9+]/g, ''), [phone]);
  const isFormValid = fullName.trim().length > 1 && normalizedPhone.replace(/\D/g, '').length >= 10;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'crew')) {
        throw new Error('אין הרשאה להוסיף לקוח');
      }

      const name = fullName.trim();
      if (name.length < 2) {
        throw new Error('אנא הזן שם מלא');
      }

      const digitsCount = normalizedPhone.replace(/\D/g, '').length;
      if (digitsCount < 10) {
        throw new Error('אנא הזן מספר טלפון תקין');
      }

      const { data, error } = await createCustomerProfile({
        full_name: name,
        phone: normalizedPhone,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('הלקוח נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      router.back();
    },
    onError: (error: any) => {
      const message = error?.message || 'שגיאה בהוספת הלקוח';
      toast.error(message);
    },
  });

  const isPending = createMutation.isPending || batchCreateMutation.isPending;

  const handleSave = () => {
    if (!isFormValid) {
      toast.error('אנא מלא שם וטלפון תקין');
      return;
    }
    createMutation.mutate();
  };

  const SaveButton = () => {
    const disabled = !isFormValid || isPending;
    return (
      <Pressable onPress={handleSave} disabled={disabled}>
        <Text className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {isPending ? 'שומר...' : 'שמור'}
        </Text>
      </Pressable>
    );
  };

  const CloseButton = () => (
    <Pressable onPress={() => router.back()}>
      <Ionicons name="close" size={24} color="#000" />
    </Pressable>
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <SaveButton />,
      headerRight: () => <CloseButton />,
    });
  }, [isPending, isFormValid]);

  if (!user || (user.role !== 'admin' && user.role !== 'crew')) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-center text-base text-gray-600">אין הרשאה להוסיף לקוח</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={72}
      className="flex-1"
      style={{ direction: 'rtl' }}>
      <View className="flex-1 bg-gray-50" style={{ paddingTop: getAndroidTopInset(insets) }}>
        <View className="mx-4 mb-4 mt-6 rounded-lg bg-blue-50 p-4">
          <Text className="text-left text-sm font-medium text-blue-900">הוספת לקוח חדש</Text>
          <Text className="mt-1 text-left text-xs text-blue-700">
            מלא/י שם מלא ומספר טלפון כדי ליצור פרופיל חדש.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/(crew)/members/add-member/pick-contact')}
          disabled={isPending}
          className="mx-4 mb-4 flex-row items-center justify-center rounded-lg bg-gray-200 px-4 py-3">
          <Ionicons name="people" size={20} color="#374151" />
          <Text className="mr-2 text-sm font-medium text-gray-700">בחר מאנשי קשר</Text>
        </Pressable>

        <View className="mx-4 rounded-lg bg-white p-4 shadow-sm">
          <View className="gap-4">
            <View>
              <Text className="text-left text-base font-medium text-gray-900">שם מלא</Text>
              <View style={{ height: 8 }} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="הכנס/י שם מלא"
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                style={{ textAlign: 'right', direction: 'rtl' }}
                autoCorrect={false}
                autoFocus={true}
              />
            </View>

            <View>
              <Text className="text-left text-base font-medium text-gray-900">טלפון</Text>
              <View style={{ height: 8 }} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="05X-XXXXXXX"
                keyboardType="phone-pad"
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                style={{ textAlign: 'right', direction: 'rtl' }}
              />
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { createCustomerProfile } from '@/services/crew/profiles';
import { User } from '@/types/auth';

type AddCustomerInlineStepProps = {
  onCreated: (customer: User) => void;
  onCancel: () => void;
};

const AddCustomerInlineStep = ({ onCreated, onCancel }: AddCustomerInlineStepProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const normalizedPhone = useMemo(() => phone.replace(/[^0-9+]/g, ''), [phone]);
  const isFormValid = fullName.trim().length > 1 && normalizedPhone.replace(/\D/g, '').length >= 10;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || user.role !== 'admin') {
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
    onSuccess: (data) => {
      toast.success('הלקוח נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      if (data) {
        onCreated(data as User);
      } else {
        onCancel();
      }
    },
    onError: (error: any) => {
      const message = error?.message || 'שגיאה בהוספת הלקוח';
      toast.error(message);
    },
  });

  const handleSave = () => {
    if (!isFormValid) {
      toast.error('אנא מלא שם וטלפון תקין');
      return;
    }
    createMutation.mutate();
  };

  if (!user || user.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-center text-base text-gray-600">אין הרשאה להוסיף לקוח</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={72} className="flex-1">
      <View className="flex-1 bg-gray-50" style={{ direction: 'rtl' }}>
        <View className="mx-4 mb-4 mt-6 rounded-lg bg-blue-50 p-4">
          <Text className="text-left text-sm font-medium text-blue-900">הוספת לקוח חדש</Text>
          <Text className="mt-1 text-left text-xs text-blue-700">
            מלא/י שם מלא ומספר טלפון כדי ליצור פרופיל חדש.
          </Text>
        </View>

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

        <View className="mx-4 mt-6 gap-3">
          <Pressable
            onPress={handleSave}
            disabled={!isFormValid || createMutation.isPending}
            className={`items-center justify-center rounded-2xl py-3 ${
              isFormValid ? 'bg-black' : 'bg-slate-200'
            }`}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Text
              className={`text-sm font-semibold ${
                isFormValid ? 'text-white' : 'text-slate-500'
              }`}>
              {createMutation.isPending ? 'שומר...' : 'שמור'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            className="items-center justify-center rounded-2xl border border-slate-200 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Text className="text-sm font-semibold text-slate-700">חזרה</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddCustomerInlineStep;

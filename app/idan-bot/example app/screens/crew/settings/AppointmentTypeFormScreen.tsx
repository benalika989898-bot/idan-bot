import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createAppointmentType, updateAppointmentType } from '@/services/crew/appointmentTypes';
import { fetchCrewMembers } from '@/services/crew/profiles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { toast } from 'sonner-native';

interface AppointmentType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color?: string | null;
  can_use_tickets?: boolean;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentTypeFormData {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  color: string;
  can_use_tickets: boolean;
  is_active: boolean;
}

const COLOR_OPTIONS = [
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#34d399',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#f87171',
  '#ef4444',
  '#f472b6',
  '#a78bfa',
  '#8b5cf6',
];

export default function AppointmentTypeFormScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isEditing = id !== 'new';
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState<AppointmentTypeFormData>({
    name: '',
    description: '',
    duration_minutes: '30',
    price: '',
    color: COLOR_OPTIONS[0],
    can_use_tickets: true,
    is_active: true,
  });
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState<string | null>(user?.id ?? null);

  const { data: crewMembers = [], isLoading: isLoadingCrewMembers } = useQuery({
    queryKey: ['crewMembersProfiles'],
    queryFn: async () => {
      const { data, error } = await fetchCrewMembers();
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: appointmentType, isLoading } = useQuery({
    queryKey: ['appointmentType', id],
    queryFn: async () => {
      if (!isEditing) return null;

      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AppointmentType;
    },
    enabled: isEditing,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<AppointmentType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await createAppointmentType(data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('סוג הטיפול נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['appointmentTypes'], exact: false });
      setTimeout(() => router.back(), 0);
    },
    onError: () => {
      toast.error('שגיאה בהוספת סוג הטיפול');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Omit<AppointmentType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await updateAppointmentType(id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('סוג הטיפול עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['appointmentTypes'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointmentType', id] });
      setTimeout(() => router.back(), 0);
    },
    onError: () => {
      toast.error('שגיאה בעדכון סוג הטיפול');
    },
  });

  useEffect(() => {
    if (appointmentType) {
      setFormData({
        name: appointmentType.name,
        description: appointmentType.description || '',
        duration_minutes: appointmentType.duration_minutes.toString(),
        price: appointmentType.price?.toString() || '',
        color: appointmentType.color || COLOR_OPTIONS[0],
        can_use_tickets: appointmentType.can_use_tickets ?? true,
        is_active: appointmentType.is_active,
      });
      setSelectedCrewMemberId(appointmentType.user_id || user?.id || null);
    } else if (!isEditing && user?.id) {
      setSelectedCrewMemberId(user.id);
    }
  }, [appointmentType, isEditing, user?.id]);

  const hasChanges = useMemo(() => {
    if (!isEditing || !appointmentType) return true;

    const hasCrewChange = isAdmin
      ? selectedCrewMemberId !== (appointmentType.user_id || user?.id || null)
      : false;

    return (
      formData.name !== appointmentType.name ||
      formData.description !== (appointmentType.description || '') ||
      formData.duration_minutes !== appointmentType.duration_minutes.toString() ||
      formData.price !== (appointmentType.price?.toString() || '') ||
      formData.color !== (appointmentType.color || COLOR_OPTIONS[0]) ||
      formData.can_use_tickets !== (appointmentType.can_use_tickets ?? true) ||
      formData.is_active !== appointmentType.is_active ||
      hasCrewChange
    );
  }, [formData, appointmentType, isAdmin, isEditing, selectedCrewMemberId, user?.id]);

  const isFormValid = useMemo(() => {
    return (
      formData.name.trim() &&
      formData.duration_minutes.trim() &&
      !isNaN(Number(formData.duration_minutes)) &&
      Number(formData.duration_minutes) > 0
    );
  }, [formData.name, formData.duration_minutes]);

  const updateField = React.useCallback(
    (field: keyof AppointmentTypeFormData, value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleSave = React.useCallback(() => {
    const cleanName = formData.name.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    if (!cleanName) {
      toast.error('נא להזין שם לסוג הטיפול');
      return;
    }

    if (!formData.duration_minutes || isNaN(Number(formData.duration_minutes))) {
      toast.error('נא להזין משך זמן תקין');
      return;
    }

    if (isAdmin && !selectedCrewMemberId) {
      toast.error('נא לבחור איש צוות');
      return;
    }

    const data = {
      name: cleanName,
      description: formData.description.trim() || undefined,
      duration_minutes: Number(formData.duration_minutes),
      price: formData.price ? Number(formData.price) : undefined,
      color: formData.color,
      can_use_tickets: formData.can_use_tickets,
      is_active: formData.is_active,
      ...(isAdmin && selectedCrewMemberId ? { user_id: selectedCrewMemberId } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }, [formData, isEditing, isAdmin, selectedCrewMemberId, createMutation, updateMutation]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const isButtonDisabled = useMemo(() => {
    return isPending || !isFormValid || (isEditing && !hasChanges);
  }, [isPending, isFormValid, isEditing, hasChanges]);

  const buttonTitle = useMemo(() => {
    return isPending ? 'שומר...' : isEditing ? 'עדכן טיפול' : 'שמור טיפול';
  }, [isPending, isEditing]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={isButtonDisabled}>
          <Text
            className={`px-4 text-base font-semibold ${isButtonDisabled ? 'text-gray-400' : 'text-black'}`}>
            {buttonTitle}
          </Text>
        </Pressable>
      ),
    });
  }, [isButtonDisabled, buttonTitle, handleSave]);

  if (isEditing && isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-left text-gray-500">טוען סוג טיפול...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={'padding'}
      keyboardVerticalOffset={100}
      className="flex-1"
      style={{ direction: 'rtl' }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {isAdmin && (
            <View className="mb-4">
              <Text className="mb-2 text-left font-medium text-gray-700">שיוך לאיש צוות</Text>
              <View className="rounded-2xl bg-white p-3">
                {isLoadingCrewMembers ? (
                  <Text className="text-left text-sm text-gray-500">טוען צוות...</Text>
                ) : (
                  crewMembers.map((member) => {
                    const memberName = (member as any).full_name || 'ללא שם';
                    const isSelected = selectedCrewMemberId === (member as any).id;
                    return (
                      <Pressable
                        key={(member as any).id}
                        onPress={() => setSelectedCrewMemberId((member as any).id)}
                        disabled={isPending}
                        className={`flex-row items-center justify-between rounded-lg px-3 py-3 ${
                          isSelected ? 'bg-gray-50' : ''
                        }`}>
                        <Text className="text-left text-base text-gray-800">{memberName}</Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#111827" />}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* Treatment Name */}
          <View className="mb-4">
            <Text className="mb-2 text-left font-medium text-gray-700">שם הטיפול *</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text: string) => updateField('name', text)}
              placeholder="למשל: מניקור, פדיקור, ציפוי ג'ל..."
              editable={!isPending}
              className="rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-2 text-left font-medium text-gray-700">תיאור</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text: string) => updateField('description', text)}
              placeholder="תיאור קצר של הטיפול..."
              multiline
              numberOfLines={3}
              editable={!isPending}
              className="rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
              textAlignVertical="top"
            />
          </View>

          {/* Duration */}
          <View className="mb-4">
            <Text className="mb-2 text-left font-medium text-gray-700">משך הטיפול (דקות) *</Text>
            <TextInput
              value={formData.duration_minutes}
              onChangeText={(text: string) => updateField('duration_minutes', text)}
              placeholder="60"
              keyboardType="numeric"
              editable={!isPending}
              className="rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
            />
          </View>

          {/* Price */}
          <View className="mb-4">
            <Text className="mb-2 text-left font-medium text-gray-700">מחיר (₪)</Text>
            <TextInput
              value={formData.price}
              onChangeText={(text: string) => updateField('price', text)}
              placeholder="120"
              keyboardType="numeric"
              editable={!isPending}
              className="rounded-lg bg-white p-3 text-right disabled:bg-gray-100"
            />
          </View>

          {/* Color */}
          <View className="mb-4">
            <Text className="mb-2 text-left font-medium text-gray-700">צבע לטיפול</Text>
            <View className="rounded-2xl bg-white p-3">
              <View className="gap-3">
                <View
                  className="h-10 w-full rounded-xl"
                  style={{ backgroundColor: formData.color }}
                />
                <View className="flex-row flex-wrap gap-3">
                  {COLOR_OPTIONS.map((color) => {
                    const isSelected = formData.color === color;
                    return (
                      <Pressable
                        key={color}
                        onPress={() => updateField('color', color)}
                        disabled={isPending}
                        style={{ opacity: isPending ? 0.6 : 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: color,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? '#0f172a' : '#e5e7eb',
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Active Toggle */}
          <View className="mb-6">
            <Text className="mb-2 text-left font-medium text-gray-700">סטטוס</Text>
            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4">
              <Text className="text-left text-gray-600">פעיל</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value: boolean) => updateField('is_active', value)}
                disabled={isPending}
                trackColor={{
                  false: isPending ? '#e5e7eb' : '#f3f4f6',
                  true: isPending ? '#9ca3af' : '#10b981',
                }}
                thumbColor={formData.is_active ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>

          {/* Ticket Payment Toggle */}
          <View className="mb-6">
            <Text className="mb-2 text-left font-medium text-gray-700">תשלום בכרטיסים</Text>
            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4">
              <Text className="text-left text-gray-600">אפשר שימוש בכרטיסים</Text>
              <Switch
                value={formData.can_use_tickets}
                onValueChange={(value: boolean) => updateField('can_use_tickets', value)}
                disabled={isPending}
                trackColor={{
                  false: isPending ? '#e5e7eb' : '#f3f4f6',
                  true: isPending ? '#9ca3af' : '#10b981',
                }}
                thumbColor={formData.can_use_tickets ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>

          {/* Info Section */}
          <View className="mb-6 rounded-lg bg-blue-50 p-4">
            <View className="flex-row gap-2">
              <Ionicons
                name="information-circle"
                size={20}
                color="#3B82F6"
                style={{ marginRight: 8 }}
              />
              <View className="flex-1 gap-2">
                <Text className="text-left text-sm font-medium text-blue-800">
                  טיפים לסוגי טיפולים
                </Text>
                <Text className="text-left text-xs text-blue-600">
                  • בחר שם ברור ומתאר לטיפול{'\n'}• הגדר משך זמן מדויק כדי לאפשר תזמון נכון{'\n'}•
                  ציון מחיר יעזור ללקוחות לדעת מה לצפות{'\n'}• ניתן לכבות סוגי טיפולים זמנית במקום
                  למחוק אותם
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

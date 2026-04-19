import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchCrewMembers } from '@/services/crew/profiles';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

interface AppointmentType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  is_active: boolean;
  user_id: string;
  display_order?: number | null;
  created_at: string;
  updated_at: string;
}

const AppointmentTypeCard: React.FC<{
  appointmentType: AppointmentType;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  crewMemberName?: string;
}> = ({ appointmentType, onEdit, onDelete, crewMemberName }) => (
  <View className="rounded-lg bg-white p-4 shadow-sm">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 gap-1">
        <Text
          className="text-left text-lg font-semibold text-gray-900"
          style={{ direction: 'rtl' }}>
          {appointmentType.name}
        </Text>
        {crewMemberName && (
          <Text className="text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
            איש צוות: {crewMemberName}
          </Text>
        )}
        {appointmentType.description && (
          <Text className=" text-left text-sm text-gray-600" style={{ direction: 'rtl' }}>
            {appointmentType.description}
          </Text>
        )}
        <View className="mt-2 flex-row gap-4">
          <Text className="text-sm text-gray-500">
            משך: {appointmentType.duration_minutes} דקות
          </Text>
          {appointmentType.price && (
            <Text className="text-sm text-gray-500">מחיר: ₪{appointmentType.price}</Text>
          )}
        </View>
        {!appointmentType.is_active && <Text className="mt-1 text-sm text-red-500">לא פעיל</Text>}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => onEdit(appointmentType.id)}
          className="rounded-full bg-gray-100 p-2"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="pencil" size={16} color="#6B7280" />
        </Pressable>
        <Pressable
          onPress={() => onDelete(appointmentType.id)}
          className="rounded-full bg-red-100 p-2"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="trash" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  </View>
);

export default function AppointmentTypesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembersProfiles'],
    queryFn: async () => {
      const { data, error } = await fetchCrewMembers();
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const crewMemberNameById = useMemo(() => {
    if (!isAdmin) return {};
    const list = Array.isArray(crewMembers) ? crewMembers : [];
    return list.reduce(
      (acc, member) => {
        acc[(member as any).id] = (member as any).full_name || 'ללא שם';
        return acc;
      },
      {} as Record<string, string>
    );
  }, [crewMembers, isAdmin]);

  const { data: appointmentTypes, isLoading } = useQuery({
    queryKey: ['appointmentTypes', isAdmin ? 'all' : user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase.from('appointment_types').select('*');
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AppointmentType[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointment_types').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('סוג הטיפול נמחק בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['appointmentTypes'], exact: false });
    },
    onError: () => {
      toast.error('שגיאה במחיקת סוג הטיפול');
    },
  });

  const handleEdit = (id: string) => {
    router.push(`/(crew)/settings/appointment-types/${id}`);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'מחיקת סוג טיפול',
      'האם אתה בטוח שברצונך למחוק את סוג הטיפול? פעולה זו אינה ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  // Add button component
  const AddButton = () => (
    <Pressable onPress={() => router.push('/(crew)/settings/appointment-types/new')}>
      <Text className="px-4 text-base font-semibold text-black">הוספה</Text>
    </Pressable>
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <AddButton />,
    });
    navigation.setOptions({ title: 'סוגי טיפולים' });
  }, [navigation]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">טוען סוגי טיפולים...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ direction: 'rtl' }}
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}>
      <View className="gap-4 p-4">
        {appointmentTypes && appointmentTypes.length > 0 ? (
          appointmentTypes.map((appointmentType) => (
            <AppointmentTypeCard
              key={appointmentType.id}
              appointmentType={appointmentType}
              onEdit={handleEdit}
              onDelete={handleDelete}
              crewMemberName={isAdmin ? crewMemberNameById[appointmentType.user_id] : undefined}
            />
          ))
        ) : (
          <View className="rounded-lg bg-white p-8 text-center">
            <Ionicons
              name="medical"
              size={48}
              color="#D1D5DB"
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text
              className="mb-2 text-lg font-medium text-gray-900"
              style={{ textAlign: 'center', direction: 'rtl' }}>
              אין סוגי טיפולים
            </Text>
            <Text
              className="text-sm text-gray-500"
              style={{ textAlign: 'center', direction: 'rtl' }}>
              התחל בהוספת סוגי הטיפולים שאת/ה מספק/ת
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

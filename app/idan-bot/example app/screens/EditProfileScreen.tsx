import { Container } from '@/components/Container';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { fetchCustomerAppointments } from '@/services/crew/appointments';
import { uploadAvatarImage } from '@/services/imageUpload';
import { Appointment } from '@/types/appointments';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APPOINTMENT_HISTORY_PAGE_SIZE = 20;

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileImage, setProfileImage] = useState(user?.avatar_url || '');

  // Track if there are changes
  const hasChanges =
    fullName.trim() !== (user?.full_name || '') || profileImage !== (user?.avatar_url || '');

  const { isUploading, isUpdating, updateFullProfile } = useProfile({
    onSuccess: () => {
      router.back();
      Alert.alert('הצלחה', 'הפרופיל עודכן בהצלחה!');
    },
    onError: () => {
      Alert.alert('שגיאה', 'נכשל לעדכן את הפרופיל. אנא נסה שוב.');
    },
  });

  const {
    data: appointmentPages,
    isLoading: isLoadingAppointments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['profile-appointments', user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return [];
      const { data, error } = await fetchCustomerAppointments(user.id, {
        limit: APPOINTMENT_HISTORY_PAGE_SIZE,
        offset: pageParam,
      });
      if (error) throw new Error(error.message || 'Failed to fetch appointments');
      return (data || []) as Appointment[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < APPOINTMENT_HISTORY_PAGE_SIZE
        ? undefined
        : allPages.length * APPOINTMENT_HISTORY_PAGE_SIZE,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const appointments = useMemo(
    () => appointmentPages?.pages.flatMap((page) => page) || [],
    [appointmentPages]
  );

  const formatAppointmentDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Jerusalem',
    });

  const formatAppointmentTime = (timeString: string) => (timeString ? timeString.slice(0, 5) : '');

  const getAppointmentStatus = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') {
      return { label: 'בוטל', color: '#EF4444' };
    }

    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.start_time}`
    );
    if (appointmentDateTime.getTime() > Date.now()) {
      return { label: 'מתוכנן', color: '#3B82F6' };
    }

    return { label: 'הושלם', color: '#22C55E' };
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const status = getAppointmentStatus(item);

    return (
      <View className="rounded-2xl bg-gray-50 px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-left text-sm font-semibold text-gray-900">
              {item.appointment_type?.name || 'שירות לא ידוע'}
            </Text>
            <Text className="text-left text-xs text-gray-500">
              {formatAppointmentDate(item.appointment_date)} •{' '}
              {formatAppointmentTime(item.start_time)}
              {item.crew_member?.full_name ? ` • ${item.crew_member.full_name}` : ''}
            </Text>
            {item.status === 'cancelled' && item.cancellation_reason ? (
              <Text className="text-left text-xs text-red-500">
                סיבה: {item.cancellation_reason}
              </Text>
            ) : null}
          </View>
          <View className="items-end gap-1">
            <Text className="text-sm font-semibold text-gray-900">
              ₪{item.appointment_type?.price || 0}
            </Text>
            <View className="flex-row items-center gap-1">
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <Text className="text-xs text-gray-500">{status.label}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View className="w-full gap-6 pb-6">
      <View className="items-center gap-4 py-8">
        <Pressable onPress={pickImage} disabled={isUploading} className="relative">
          <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-200">
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={1000}
              />
            ) : (
              <Ionicons name="person" size={48} color="#9CA3AF" />
            )}
          </View>

          <View className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-black shadow-lg">
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </View>
        </Pressable>

        <Text className="text-center text-sm text-gray-500">לחצו כדי לשנות את תמונת הפרופיל</Text>
      </View>

      <View className="w-full gap-2">
        <Text className="text-left text-base font-medium text-gray-900">שם מלא</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="הכנס את שמך המלא"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-right "
          autoCapitalize="words"
          textContentType="name"
        />
      </View>

      <View className="w-full gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900">היסטוריית תורים</Text>
          <Text className="text-sm text-gray-400">{appointments.length}</Text>
        </View>
        {isLoadingAppointments ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color="#000" />
          </View>
        ) : null}
      </View>
    </View>
  );

  const pickImage = async () => {
    try {
      const imageUrl = await uploadAvatarImage();
      setProfileImage(imageUrl);
    } catch (error: any) {
      if (error.message !== 'Image selection was canceled') {
        Alert.alert('שגיאה', 'נכשל להעלות תמונה. אנא נסה שוב.');
      }
    }
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('שגיאה', 'אנא הכנס את שמך המלא.');
      return;
    }

    updateFullProfile(fullName.trim(), profileImage);
  };

  const handleLogout = () => {
    Alert.alert('התנתק', 'האם אתה בטוח שברצונך להתנתק?', [
      {
        text: 'בטל',
        style: 'cancel',
      },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('שגיאה', 'נכשל להתנתק. אנא נסה שוב.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('מחק חשבון', 'האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו בלתי הפיכה!', [
      {
        text: 'בטל',
        style: 'cancel',
      },
      {
        text: 'מחק חשבון',
        style: 'destructive',
        onPress: () => {
          // Double confirmation for account deletion
          Alert.alert(
            'אישור מחיקה',
            'זוהי הזדמנותך האחרונה! האם אתה בטוח לחלוטין שברצונך למחוק את החשבון?',
            [
              {
                text: 'בטל',
                style: 'cancel',
              },
              {
                text: 'כן, מחק',
                style: 'destructive',
                onPress: deleteAccount,
              },
            ]
          );
        },
      },
    ]);
  };

  const deleteAccount = async () => {
    try {
      if (!user?.id) {
        Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש.');
        return;
      }

      // Delete user profile from profiles table
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw profileError;
      }

      // Delete user account from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Even if auth deletion fails, we'll still sign out since profile is deleted
      }

      // Sign out and redirect to login
      await signOut();
      router.replace('/login');

      Alert.alert('הושלם', 'החשבון נמחק בהצלחה.');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('שגיאה', 'נכשל למחוק את החשבון. אנא נסה שוב או צור קשר עם התמיכה.');
    }
  };

  return (
    <Container topInset="medium" className="flex-1 justify-between">
      <View style={{ direction: 'rtl' }} className="flex-1">
        {/* Header */}
        <View className="relative flex-row items-center justify-between px-6 py-4">
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="close" size={24} color="#000" />
          </Pressable>

          {/* Centered title */}
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-lg font-semibold">פרופיל</Text>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={isUpdating || !hasChanges}
            className={`rounded-lg px-4 py-2 ${
              isUpdating || !hasChanges ? 'bg-gray-300' : 'bg-black'
            }`}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-sm font-medium text-white">שמירה</Text>
            )}
          </Pressable>
        </View>

        <FlashList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={88}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerClassName="px-6 pb-4"
          ListEmptyComponent={
            isLoadingAppointments ? null : (
              <View className="items-center gap-2 px-6 py-4">
                <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
                <Text className="text-sm text-gray-400">אין היסטוריית תורים עדיין</Text>
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Action Buttons */}
      <View style={{ paddingBottom: insets.bottom }} className="items-center gap-3 p-6">
        <Pressable
          onPress={handleLogout}
          className="w-full  rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <Text className="text-center text-base font-medium text-red-600">התנתקות</Text>
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          className="w-full  rounded-lg border border-red-600 bg-red-100 px-4 py-3">
          <Text className="text-center text-base font-medium text-red-700">מחיקת חשבון</Text>
        </Pressable>
      </View>
    </Container>
  );
}

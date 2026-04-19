import { useAuth } from '@/contexts/AuthContext';
import { deleteBreakDate, fetchBreakDates } from '@/services/crew/breakDates';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function BreakDatesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Fetch break dates
  const { data: breakDates, isLoading } = useQuery({
    queryKey: ['breakDates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await fetchBreakDates(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Delete break date mutation
  const deleteBreakMutation = useMutation({
    mutationFn: async (breakDateId: string) => {
      const { error } = await deleteBreakDate(breakDateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('תאריך חופש נמחק בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['breakDates', user?.id] });
    },
    onError: (error) => {
      console.error('Error deleting break date:', error);
      toast.error('שגיאה במחיקת תאריך חופש');
    },
  });

  const handleDeleteBreakDate = (breakDateId: string, dateRange: string) => {
    Alert.alert('מחיקת תאריך חופש', `האם אתה בטוח שאתה רוצה למחוק את ${dateRange}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => deleteBreakMutation.mutate(breakDateId),
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return startDate === endDate ? start : `${start} - ${end}`;
  };

  const fullDayBreakDates = useMemo(
    () => (breakDates || []).filter((breakDate) => !breakDate.start_time && !breakDate.end_time),
    [breakDates]
  );

  // Add button component
  const AddButton = () => (
    <Pressable onPress={() => router.push('/(crew)/settings/break-dates/add')}>
      <Text className="px-4 text-base font-semibold text-black">הוסף</Text>
    </Pressable>
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <AddButton />,
    });
  }, [navigation]);

  if (!user) return null;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4"
      style={{ direction: 'rtl' }}
      showsVerticalScrollIndicator={false}>
      {/* Break dates list */}
      <View className="gap-4">
        <View className="overflow-hidden rounded-lg bg-white shadow-sm">
          <View className="gap-1 border-b border-gray-100 px-4 py-3">
            <Text className="text-left text-base font-medium text-gray-900">תאריכי החופש שלך</Text>
            <Text className="text-left text-sm text-gray-500">תאריכים בהם לא תוכל לקבל הזמנות</Text>
          </View>

          <View className="px-4">
            {isLoading ? (
              <View className="py-8">
                <Text className="text-center text-gray-500">טוען...</Text>
              </View>
            ) : fullDayBreakDates.length > 0 ? (
              fullDayBreakDates.map((breakDate, index) => (
                <View
                  key={breakDate.id}
                  className={`flex-row items-center justify-between py-4 ${
                    index < fullDayBreakDates.length - 1 ? 'border-b border-gray-100' : ''
                  }`}>
                  <View className="flex-1">
                    <Text className="text-left font-medium text-gray-900">
                      {formatDateRange(breakDate.start_date, breakDate.end_date)}
                    </Text>
                    {breakDate.reason && (
                      <Text className="text-left text-sm text-gray-500">{breakDate.reason}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() =>
                      handleDeleteBreakDate(
                        breakDate.id,
                        formatDateRange(breakDate.start_date, breakDate.end_date)
                      )
                    }
                    disabled={deleteBreakMutation.isPending}
                    className="rounded-full p-2"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.5 : 1,
                      backgroundColor: pressed ? '#fee2e2' : '#fef2f2',
                    })}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </Pressable>
                </View>
              ))
            ) : (
              <View className="items-center gap-4 py-12">
                <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                <View className="gap-2">
                  <Text className="text-center text-lg text-gray-500">אין תאריכי חופש מוגדרים</Text>
                  <Text className="text-center text-sm text-gray-400">
                    לחץ על "הוסף" בחלק העליון כדי להתחיל
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Info section */}
        <View className="rounded-xl border border-blue-100 bg-blue-50 p-4 ">
          <View className="flex-row gap-3">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 gap-1">
              <Text className="text-left text-sm font-semibold text-blue-900">איך זה עובד?</Text>
              <Text className="text-left text-sm leading-6 text-blue-700">
                • תאריכי החופש יחסמו אוטומטית את האפשרות של לקוחות להזמין בתאריכים אלה
                {'\n'}• תוכל להוסיף תאריכים בודדים או טווחי תאריכים
                {'\n'}• שינויים יכנסו לתוקף מיד לאחר השמירה
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

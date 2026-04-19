import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { FontAwesome6 } from '@expo/vector-icons';

import { deleteBreakDate } from '@/services/crew/breakDates';
import { toast } from 'sonner-native';

const BreakActionSheetScreen = () => {
  const queryClient = useQueryClient();
  const {
    'break-id': breakIdParam,
    date: dateParam,
    startTime: startTimeParam,
    endTime: endTimeParam,
    reason: reasonParam,
  } = useLocalSearchParams<{
    'break-id'?: string | string[];
    date?: string | string[];
    startTime?: string | string[];
    endTime?: string | string[];
    reason?: string | string[];
  }>();

  const breakId = Array.isArray(breakIdParam) ? breakIdParam[0] : breakIdParam;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;
  const startTime = Array.isArray(startTimeParam) ? startTimeParam[0] : startTimeParam;
  const endTime = Array.isArray(endTimeParam) ? endTimeParam[0] : endTimeParam;
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!breakId) {
        throw new Error('Missing break id');
      }
      const { error } = await deleteBreakDate(breakId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-range'] });
      toast.success('ההפסקה נמחקה בהצלחה');
      router.back();
    },
    onError: (error: any) => {
      console.error('Error deleting break:', error);
      toast.error('שגיאה במחיקת הפסקה');
    },
  });

  const handleDelete = () => {
    Alert.alert('מחיקת הפסקה', 'האם למחוק את ההפסקה?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחיקה', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (!breakId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">לא נמצא מזהה הפסקה</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-end p-4">
      <View className="rounded-3xl bg-white px-6 pb-8 pt-4 shadow-lg">
        <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
        <View className="items-center">
          <Text className="text-base font-semibold text-slate-900">הפסקה</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {date ? dayjs(date).format('DD/MM/YYYY') : 'תאריך לא זמין'}
          </Text>
          <Text className="mt-3 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
            {startTime || '--:--'} - {endTime || '--:--'}
          </Text>
          {reason ? <Text className="mt-2 text-xs text-slate-500">סיבה: {reason}</Text> : null}
        </View>

        <View className="mt-6 gap-3">
          <Pressable
            onPress={handleDelete}
            className="flex-row items-center justify-center rounded-2xl bg-black py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            {deleteMutation.isPending ? (
              <>
                <Text className="mr-2 text-sm font-semibold text-white">מוחק...</Text>
                <ActivityIndicator size="small" color="#fff" />
              </>
            ) : (
              <>
                <Text className="mr-2 text-sm font-semibold text-white">מחק הפסקה</Text>
                <FontAwesome6 name="trash" size={14} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default BreakActionSheetScreen;

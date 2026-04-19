import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBreakDate } from '@/services/crew/breakDates';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { BreakDate } from '@/services/crew/breakDates';

interface BreakCardProps {
  breakHours: BreakDate;
}

const BreakCard: React.FC<BreakCardProps> = ({ breakHours }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (breakId: string) => deleteBreakDate(breakId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      toast.success('הפסקה נמחקה בהצלחה');
    },
    onError: (error: any) => {
      console.error('Error deleting break:', error);
      toast.error('שגיאה במחיקת ההפסקה');
    },
    onSettled: () => {
      setDeleting(false);
    },
  });

  const handleDeleteBreak = () => {
    Alert.alert(
      'מחיקת הפסקה',
      'האם אתה בטוח שברצונך למחוק את ההפסקה?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            deleteMutation.mutate(breakHours.id);
          },
        },
      ]
    );
  };

  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || '';
  };

  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return null;
    
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    return diffMinutes;
  };

  const duration = calculateDuration(breakHours.start_time, breakHours.end_time);

  return (
    <View style={{ direction: 'rtl' }} className="mb-1 rounded-lg border border-gray-200 bg-slate-50">
      <View className="px-3 py-2">
        <View className="flex-row items-center">
          <View className="relative">
            <View 
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200"
            >
              <FontAwesome6 name="clock" size={16} color="#64748b" />
            </View>
          </View>

          <View className="mr-3 flex-1">
            <Text className="text-left text-base font-medium text-slate-700">
              הפסקה
            </Text>
            {breakHours.reason && (
              <Text className="text-left text-sm text-slate-500">
                {breakHours.reason}
              </Text>
            )}
          </View>

          {breakHours.start_time && breakHours.end_time && (
            <View className="rounded-lg bg-slate-700 px-3 py-1">
              <Text className="text-sm font-medium text-white">
                {formatTime(breakHours.start_time)} - {formatTime(breakHours.end_time)}
              </Text>
            </View>
          )}
        </View>

        {duration && (
          <View className="mt-2 flex-row items-center">
            <FontAwesome6 name="clock" size={10} color="#64748b" />
            <Text className="mr-1 text-xs text-slate-500">
              {duration} דקות
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row border-t border-gray-200">
        <Pressable
          onPress={handleDeleteBreak}
          disabled={deleting}
          className="flex-1 flex-row items-center justify-center py-3"
          style={({ pressed }) => ({
            backgroundColor: deleting ? '#f9fafb' : pressed ? '#f8fafc' : '#ffffff',
          })}>
          {deleting ? (
            <>
              <Text className="ml-2 text-sm font-medium text-gray-400">מוחק...</Text>
              <ActivityIndicator size="small" color="#9CA3AF" />
            </>
          ) : (
            <>
              <Text className="ml-2 text-sm font-medium text-gray-700">מחק הפסקה</Text>
              <FontAwesome6 name="xmark" size={12} color="#dc2626" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default BreakCard;
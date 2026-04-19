import DateTimeField from '@/components/ui/DateTimeField';
import TimeRangePicker from '@/components/ui/TimeRangePicker';
import { useAuth } from '@/contexts/AuthContext';
import { addBreakHours } from '@/services/crew/breakDates';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function AddBreakHoursScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { selectedDate } = useLocalSearchParams();

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedDateValue, setSelectedDateValue] = useState<string>('');

  // Initialize times
  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(12, 0, 0, 0); // Default to 12:00

    const end = new Date(now);
    end.setHours(13, 0, 0, 0); // Default to 13:00

    setStartTime(start);
    setEndTime(end);
  }, []);

  useEffect(() => {
    if (selectedDate && typeof selectedDate === 'string') {
      setSelectedDateValue(selectedDate);
    }
  }, [selectedDate]);

  const formatDateValue = (date: Date) => {
    return date.toLocaleDateString('en-CA');
  };

  // Add break hours mutation
  const addBreakMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!selectedDateValue) throw new Error('No date selected');

      const startTimeStr = startTime.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const endTimeStr = endTime.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const { data, error } = await addBreakHours(
        user.id,
        selectedDateValue,
        startTimeStr,
        endTimeStr
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('שעות הפסקה נוספו בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['schedule-range'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      router.back();
    },
    onError: (error) => {
      console.error('Error adding break hours:', error);
      toast.error('שגיאה בהוספת שעות הפסקה');
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleSave = () => {
    if (startTime >= endTime) {
      toast.error('שעת התחלה חייבת להיות לפני שעת הסיום');
      return;
    }
    addBreakMutation.mutate();
  };

  const SaveButton = () => {
    const disabled = addBreakMutation.isPending;
    return (
      <Pressable onPress={handleSave} disabled={disabled}>
        <Text
          className={`px-4 text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {disabled ? 'שומר...' : 'שמור'}
        </Text>
      </Pressable>
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <SaveButton />,
    });
  }, [startTime, endTime, addBreakMutation.isPending]);

  if (!user || !selectedDateValue) return null;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4"
      contentContainerStyle={{ direction: 'rtl' }}
      showsVerticalScrollIndicator={false}>
      {/* Date Display */}
      <View className="mb-4 rounded-lg bg-slate-100 p-4">
        <Text className="text-left text-sm font-medium text-slate-700">תאריך נבחר</Text>
        <Text className="mt-1 text-center text-lg font-semibold text-slate-800">
          {formatDate(selectedDateValue)}
        </Text>
      </View>

      <View className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <Text className="text-left text-sm text-slate-600">בחירת תאריך</Text>
        <DateTimeField
          value={new Date(`${selectedDateValue}T00:00:00`)}
          mode="date"
          locale="he-IL"
          displayValue={formatDate(selectedDateValue)}
          onChange={(date) => setSelectedDateValue(formatDateValue(date))}
          triggerStyle={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 8,
            backgroundColor: '#f8fafc',
            alignItems: 'center',
          }}
          labelStyle={{ fontSize: 16, color: '#334155' }}
        />
      </View>

      {/* Time Selection */}
      <View className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
        <View className="border-b border-slate-200 px-4 py-3">
          <Text className="text-left text-base font-medium text-slate-900">בחירת שעות הפסקה</Text>
          <Text className="text-left text-sm text-slate-600">
            בחר את שעות ההתחלה והסיום של ההפסקה
          </Text>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Labels Row */}

          {/* Time Pickers Row */}
          <TimeRangePicker
            startValue={startTime}
            endValue={endTime}
            startLabel={formatTime(startTime)}
            endLabel={formatTime(endTime)}
            minuteInterval={1}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
          />
        </View>
      </View>

      {/* Summary */}
      <View className="mb-6 rounded-lg bg-slate-50 p-4">
        <Text className="mb-2 text-left text-sm font-medium text-slate-700">סיכום</Text>
        <Text className="text-left text-base text-slate-900">
          הפסקה מ-{formatTime(startTime)} עד {formatTime(endTime)}
        </Text>
        <Text className="mt-1 text-left text-sm text-slate-600">
          משך ההפסקה: {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} דקות
        </Text>
      </View>

      {/* Info section */}
      <View className="rounded-lg bg-slate-100 p-4">
        <View className="flex-row gap-3">
          <Ionicons name="information-circle" size={24} color="#475569" />
          <View className="flex-1 gap-1">
            <Text className="text-left font-medium text-slate-700">מידע חשוב</Text>
            <Text className="text-left text-sm text-slate-600">
              • במהלך שעות ההפסקה לא תוכל לקבל הזמנות חדשות
              {'\n'}• התורים הקיימים לא יושפעו מההפסקה
              {'\n'}• תוכל לערוך או למחוק את ההפסקה מאוחר יותר במידת הצורך
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

import { useAuth } from '@/contexts/AuthContext';
import { addBreakDate } from '@/services/crew/breakDates';
import { getAndroidTopInset } from '@/utils/androidInsets';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

// Configure Hebrew locale
LocaleConfig.locales['he'] = {
  monthNames: [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ],
  monthNamesShort: [
    'ינו׳',
    'פבר׳',
    'מרץ',
    'אפר׳',
    'מאי',
    'יוני',
    'יולי',
    'אוג׳',
    'ספט׳',
    'אוק׳',
    'נוב׳',
    'דצמ׳',
  ],
  dayNames: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  dayNamesShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  today: 'היום',
};

LocaleConfig.defaultLocale = 'he';

export default function BreakDatesCalendarScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [selectedDates, setSelectedDates] = useState<{ [key: string]: any }>({});
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Add break date mutation
  const addBreakMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!startDate) throw new Error('Please select date');

      // Use endDate if selected, otherwise use startDate for single date
      const finalEndDate = endDate || startDate;
      const { data, error } = await addBreakDate(user.id, startDate, finalEndDate);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('תאריך חופש נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['breakDates', user?.id] });
      router.back();
    },
    onError: (error) => {
      console.error('Error adding break date:', error);
      toast.error('שגיאה בהוספת תאריך חופש');
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calendar date selection logic
  const onDayPress = useCallback(
    (day: any) => {
      const dateString = day.dateString;

      if (!startDate) {
        // First selection - set start date
        setStartDate(dateString);
        setEndDate(null);
        setSelectedDates({
          [dateString]: {
            selected: true,
            startingDay: true,
            endingDay: true,
            color: '#000000',
            textColor: 'white',
          },
        });
      } else if (startDate && !endDate) {
        // Second selection - complete the range
        const start = new Date(startDate);
        const end = new Date(dateString);

        if (end < start) {
          // If end is before start, swap them
          setStartDate(dateString);
          setEndDate(startDate);
          setSelectedDates(getDateRangeMarkedDates(dateString, startDate));
        } else {
          setEndDate(dateString);
          setSelectedDates(getDateRangeMarkedDates(startDate, dateString));
        }
      } else {
        // Both dates are set, start new selection
        setStartDate(dateString);
        setEndDate(null);
        setSelectedDates({
          [dateString]: {
            selected: true,
            startingDay: true,
            endingDay: true,
            color: '#000000',
            textColor: 'white',
          },
        });
      }
    },
    [startDate, endDate]
  );

  const getDateRangeMarkedDates = (start: string, end: string) => {
    const marked: { [key: string]: any } = {};
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (start === end) {
      // Single day selection
      marked[start] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: '#000000',
        textColor: 'white',
      };
    } else {
      // Range selection
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        const isStart = dateString === start;
        const isEnd = dateString === end;

        marked[dateString] = {
          selected: true,
          startingDay: isStart,
          endingDay: isEnd,
          color: '#000000',
          textColor: 'white',
        };

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return marked;
  };

  const clearSelection = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setSelectedDates({});
  }, []);

  const handleSave = useCallback(() => {
    if (!startDate) {
      toast.error('אנא בחר תאריך');
      return;
    }
    // Use startDate as endDate if no endDate is selected (single date)
    addBreakMutation.mutate();
  }, [startDate, addBreakMutation]);

  // Save button component
  const SaveButton = () => {
    const disabled = addBreakMutation.isPending || !startDate;
    return (
      <Pressable onPress={handleSave} disabled={disabled}>
        <Text
          className={`px-4 text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {addBreakMutation.isPending ? 'שומר...' : 'שמור'}
        </Text>
      </Pressable>
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <SaveButton />,
    });
  }, [startDate, endDate, addBreakMutation.isPending]);

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: getAndroidTopInset(insets) }}>
      <View className="gap-4 px-4 pt-6">
        {/* Selected dates display */}
        {startDate && (
          <View className="rounded-lg bg-white p-4 shadow-sm">
            <Text className="text-left text-sm font-medium text-gray-900">
              {!endDate
                ? 'תאריך נבחר: '
                : endDate === startDate
                  ? 'תאריך נבחר: '
                  : 'תאריכים נבחרים: '}
              {formatDate(startDate)}
              {endDate && endDate !== startDate && ` - ${formatDate(endDate)}`}
            </Text>
            <Pressable onPress={clearSelection}>
              <Text className="text-left text-xs text-blue-600">נקה בחירה</Text>
            </Pressable>
          </View>
        )}

        {/* Calendar */}
        <View className="overflow-hidden rounded-lg bg-white shadow-sm">
          <Calendar
            onDayPress={onDayPress}
            markingType="period"
            markedDates={selectedDates}
            minDate={new Date().toISOString().split('T')[0]}
            firstDay={0}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#6b7280',
              selectedDayBackgroundColor: '#000000',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#3b82f6',
              dayTextColor: '#1f2937',
              textDisabledColor: '#d1d5db',
              arrowColor: '#000000',
              monthTextColor: '#1f2937',
              indicatorColor: '#000000',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              'stylesheet.calendar.header': {
                week: {
                  marginTop: 5,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
            }}
          />
        </View>
        {/* Instructions */}
        <View className="rounded-xl border border-blue-100 bg-blue-50 p-4 ">
          <View className="flex-row gap-3">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 gap-1">
              <Text className="text-left text-sm font-semibold text-blue-900">בחר תאריכי חופש</Text>
              <Text className="text-left text-sm leading-6 text-blue-700">
                • לתאריך יחיד לחץ פעם אחת ואז שמור
                {'\n'}• לטווח תאריכים לחץ על התחלה ואז על הסיום
                {'\n'}• לביטול הבחירה לחץ על "נקה בחירה"
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import dayjs from 'dayjs';
import SheetLayout from '@/components/ui/SheetLayout';
import SheetActionButton from '@/components/ui/SheetActionButton';

const ScheduleEmptyCellSheetScreen = () => {
  const { selectedDate, selectedDateTime, crewMemberId, slotStartTime, slotEndTime, pressedTime } =
    useLocalSearchParams<{
      selectedDate?: string;
      selectedDateTime?: string;
      crewMemberId?: string;
      slotStartTime?: string;
      slotEndTime?: string;
      pressedTime?: string;
    }>();

  const resolvedDate =
    selectedDate || (selectedDateTime ? dayjs(selectedDateTime).format('YYYY-MM-DD') : '');
  const displayDate = resolvedDate ? dayjs(resolvedDate).locale('he').format('dddd, D MMMM') : '';

  const displaySlotLabel =
    pressedTime || (slotStartTime && slotEndTime ? `${slotStartTime} - ${slotEndTime}` : '');

  return (
    <SheetLayout title="בחירת פעולה" subtitle={displayDate} badgeLabel={displaySlotLabel}>
      <View className="mt-6 gap-3">
        <SheetActionButton
          label="קבע תור ללקוח"
          variant="primary"
          onPress={() => {
            router.push({
              pathname: '/(modal)/actions/calendar-book-appointment',
              params: {
                prefillDate: resolvedDate || undefined,
                crewMemberId,
                prefillTime: pressedTime || undefined,
                slotStartTime,
                slotEndTime,
                useTimePicker: 'false',
              },
            });
          }}
        />

        <SheetActionButton
          label="הוספת זמינות/הפסקה"
          onPress={() => {
            router.replace({
              pathname: '/(crew)/(tabs)/dashboard/schedule-create',
              params: {
                selectedDate: resolvedDate || undefined,
                selectedDateTime: selectedDateTime || undefined,
                crewMemberId,
              },
            });
          }}
        />

        <SheetActionButton label="ביטול" onPress={() => router.back()} />
      </View>
    </SheetLayout>
  );
};

export default ScheduleEmptyCellSheetScreen;

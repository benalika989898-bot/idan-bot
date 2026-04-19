import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import DateTimeField from '@/components/ui/DateTimeField';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface TimeSelectionStepProps {
  loading: boolean;
  availableSlots: TimeSlot[];
  selectedTimeSlot: string;
  setSelectedTimeSlot: (slotId: string) => void;
  prefillTime?: string;
  minuteInterval?: number;
  durationMinutes?: number;
  showTimePicker?: boolean;
  showSlotList?: boolean;
  refreshControl?: React.ReactElement;
  footerComponent?: React.ReactNode;
}

const TimeSlotItem = ({
  startLabel,
  endLabel,
  index,
  isSelected,
  onPress,
}: {
  startLabel: string;
  endLabel: string;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const backgroundColor = isSelected ? '#000000' : '#ffffff';
  const textColor = isSelected ? '#ffffff' : '#000000';
  const subTextColor = isSelected ? 'text-gray-300' : 'text-gray-500';

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={onPress}
        style={{
          height: 80,
          backgroundColor,
          borderRightWidth: index % 2 === 0 ? 0.5 : 0,
          borderLeftWidth: index % 2 === 1 ? 0.5 : 0,
          borderTopWidth: index < 2 ? 0.5 : 0,
          borderBottomWidth: 0.5,
          borderColor: '#F3F4F6',
        }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: textColor }} className="text-xl font-bold">
            {startLabel}
          </Text>
          <Text className={`text-sm ${subTextColor}`}>
            עד {endLabel}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

const TimeSelectionStep: React.FC<TimeSelectionStepProps> = ({
  loading,
  availableSlots,
  selectedTimeSlot,
  setSelectedTimeSlot,
  prefillTime,
  minuteInterval,
  durationMinutes,
  showTimePicker = false,
  showSlotList = true,
  refreshControl,
  footerComponent,
}) => {
  const toMinutes = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    return safeHours * 60 + safeMinutes;
  }, []);

  const formatMinutes = useCallback((totalMinutes: number) => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor(normalized % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  const getDisplayEndTime = useCallback(
    (startTime: string, fallbackEndTime: string) => {
      if (!durationMinutes) {
        return fallbackEndTime.slice(0, 5);
      }
      const startMinutes = toMinutes(startTime);
      return formatMinutes(startMinutes + durationMinutes);
    },
    [durationMinutes, formatMinutes, toMinutes]
  );
  const renderItem = useCallback(
    ({ item, index }: { item: TimeSlot; index: number }) => {
      const slotId = `${item.start_time}-${item.end_time}`;
      const startLabel = item.start_time.slice(0, 5);
      const endLabel = getDisplayEndTime(item.start_time, item.end_time);
      return (
        <TimeSlotItem
          startLabel={startLabel}
          endLabel={endLabel}
          index={index}
          isSelected={selectedTimeSlot === slotId}
          onPress={() => setSelectedTimeSlot(slotId)}
        />
      );
    },
    [getDisplayEndTime, selectedTimeSlot, setSelectedTimeSlot]
  );

  const pickerValue = useMemo(() => {
    const baseTime = selectedTimeSlot.split('-')[0] || prefillTime || availableSlots[0]?.start_time;
    const value = new Date();
    if (baseTime) {
      const [hours, minutes] = baseTime.split(':').map((part) => Number(part));
      value.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0);
    }
    return value;
  }, [availableSlots, prefillTime, selectedTimeSlot]);
  const pickerLabel = useMemo(() => {
    const hours = pickerValue.getHours().toString().padStart(2, '0');
    const minutes = pickerValue.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [pickerValue]);

  const handlePickerChange = useCallback(
    (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const targetTime = `${hours}:${minutes}`;
      const match = availableSlots.find((slot) =>
        slot.start_time.startsWith(targetTime.slice(0, 5))
      );
      if (match) {
        setSelectedTimeSlot(`${match.start_time}-${match.end_time}`);
      } else {
        setSelectedTimeSlot('');
      }
    },
    [availableSlots, setSelectedTimeSlot]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-500">טוען שעות פנויות...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {showTimePicker ? (
        <View className="px-6 pt-4">
          <Text className="text-left text-sm text-slate-600">בחירת שעה</Text>
          <DateTimeField
            value={pickerValue}
            mode="time"
            is24Hour={true}
            minuteInterval={minuteInterval || 15}
            displayValue={pickerLabel}
            onChange={handlePickerChange}
            containerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: '#f8fafc',
              marginTop: 8,
            }}
            triggerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 40,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
            labelStyle={{ fontSize: 16, color: '#0f172a' }}
            pickerStyle={{ width: 120, alignSelf: 'center' }}
          />
        </View>
      ) : null}

      {showSlotList ? (
        <FlashList
          data={availableSlots}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 200 }}
          keyExtractor={(item) => `${item.start_time}-${item.end_time}`}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListFooterComponent={footerComponent ? () => <View>{footerComponent}</View> : null}
          contentContainerClassName="py-6"
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="mt-4 text-center text-lg text-gray-500">אין שעות פנויות</Text>
            </View>
          }
        />
      ) : availableSlots.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Text className="mt-4 text-center text-lg text-gray-500">אין שעות פנויות</Text>
        </View>
      ) : null}
    </View>
  );
};

export default TimeSelectionStep;

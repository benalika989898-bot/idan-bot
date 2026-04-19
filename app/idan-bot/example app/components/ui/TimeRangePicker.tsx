import React from 'react';
import { Text, View } from 'react-native';
import DateTimeField from '@/components/ui/DateTimeField';

type TimeRangePickerProps = {
  startValue: Date;
  endValue: Date;
  startLabel: string;
  endLabel: string;
  minuteInterval?: number;
  onStartChange: (date: Date) => void;
  onEndChange: (date: Date) => void;
  startTitle?: string;
  endTitle?: string;
};

const TimeRangePicker = ({
  startValue,
  endValue,
  startLabel,
  endLabel,
  minuteInterval,
  onStartChange,
  onEndChange,
  startTitle = 'משעה',
  endTitle = 'עד',
}: TimeRangePickerProps) => {
  return (
    <View style={{ direction: 'rtl' }} className="gap-2 rounded-2xl bg-slate-50 px-4 py-3">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text className="text-left text-xs text-slate-500">{startTitle}</Text>
          <View style={{ height: 6 }} />
          <DateTimeField
            value={startValue}
            mode="time"
            is24Hour={true}
            minuteInterval={minuteInterval}
            displayValue={startLabel}
            onChange={onStartChange}
            containerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: '#f8fafc',
            }}
            triggerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: 36,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
            labelStyle={{ fontSize: 16, color: '#0f172a' }}
            pickerStyle={{ width: 90, alignSelf: 'center' }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text className="text-left text-xs text-slate-500">{endTitle}</Text>
          <View style={{ height: 6 }} />
          <DateTimeField
            value={endValue}
            mode="time"
            is24Hour={true}
            minuteInterval={minuteInterval}
            displayValue={endLabel}
            onChange={onEndChange}
            containerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: '#f8fafc',
            }}
            triggerStyle={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: 36,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
            labelStyle={{ fontSize: 16, color: '#0f172a' }}
            pickerStyle={{ width: 90, alignSelf: 'center' }}
          />
        </View>
      </View>
    </View>
  );
};

export default TimeRangePicker;

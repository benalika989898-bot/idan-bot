import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  hint?: string;
};

function formatDate(date: Date) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date: Date) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  minuteInterval = 5,
  hint,
}: DateTimeFieldProps) {
  const theme = useTheme();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.pickerRow}>
        <Pressable
          onPress={() => setShowDate(true)}
          style={[
            styles.trigger,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}>
          <ThemedText>{formatDate(value)}</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setShowTime(true)}
          style={[
            styles.trigger,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}>
          <ThemedText>{formatTime(value)}</ThemedText>
        </Pressable>
      </View>
      {showDate && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(_, date) => {
            setShowDate(false);
            if (date) onChange(date);
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          minimumDate={minimumDate}
          minuteInterval={minuteInterval}
          is24Hour
          onChange={(_, date) => {
            setShowTime(false);
            if (date) onChange(date);
          }}
        />
      )}
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  trigger: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});

import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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

export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  minuteInterval = 5,
  hint,
}: DateTimeFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.pickerRow,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}>
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(_, date) => date && onChange(date)}
        />
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          minimumDate={minimumDate}
          minuteInterval={minuteInterval}
          is24Hour
          onChange={(_, date) => date && onChange(date)}
        />
      </View>
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
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

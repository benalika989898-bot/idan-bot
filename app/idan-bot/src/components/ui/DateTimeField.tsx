import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

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

function toLocalDateTimeString(date: Date) {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({ label, value, onChange, minimumDate, hint }: DateTimeFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        className="text-left"
        value={toLocalDateTimeString(value)}
        onChangeText={(text) => {
          const parsed = new Date(text);
          if (!Number.isNaN(parsed.getTime())) {
            if (minimumDate && parsed < minimumDate) return;
            onChange(parsed);
          }
        }}
        placeholder="YYYY-MM-DDTHH:mm"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            textAlign: 'left',
          },
        ]}
      />
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
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
});

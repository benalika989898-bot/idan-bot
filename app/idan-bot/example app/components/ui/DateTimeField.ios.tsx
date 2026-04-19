import React from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type DateTimeFieldProps = {
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  displayValue?: string;
  minimumDate?: Date;
  minuteInterval?: number;
  is24Hour?: boolean;
  locale?: string;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  pickerStyle?: StyleProp<ViewStyle>;
};

const DateTimeField = ({
  value,
  mode,
  onChange,
  minimumDate,
  minuteInterval,
  is24Hour,
  locale,
  containerStyle,
  triggerStyle,
  pickerStyle,
}: DateTimeFieldProps) => {
  const wrapperStyle = containerStyle || triggerStyle;
  if (wrapperStyle) {
    return (
      <View style={wrapperStyle}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          minimumDate={minimumDate}
          minuteInterval={minuteInterval}
          is24Hour={is24Hour}
          locale={locale}
          style={pickerStyle}
          onChange={(_, date) => date && onChange(date)}
        />
      </View>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="default"
      minimumDate={minimumDate}
      minuteInterval={minuteInterval}
      is24Hour={is24Hour}
      locale={locale}
      style={pickerStyle}
      onChange={(_, date) => date && onChange(date)}
    />
  );
};

export default DateTimeField;

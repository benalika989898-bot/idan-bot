import React, { useState } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
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
};

const DateTimeField = ({
  value,
  mode,
  onChange,
  displayValue,
  minimumDate,
  minuteInterval,
  is24Hour,
  locale,
  containerStyle,
  triggerStyle,
  labelStyle,
}: DateTimeFieldProps) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Pressable onPress={() => setShowPicker(true)}>
        <View style={triggerStyle || containerStyle}>
          <Text style={labelStyle}>{displayValue}</Text>
        </View>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          minimumDate={minimumDate}
          minuteInterval={minuteInterval}
          is24Hour={is24Hour}
          locale={locale}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) {
              onChange(date);
            }
          }}
        />
      )}
    </>
  );
};

export default DateTimeField;

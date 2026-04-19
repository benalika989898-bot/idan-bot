import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { LinearTransition, FadeInDown, FadeOut } from 'react-native-reanimated';
import DateTimeField from '@/components/ui/DateTimeField';

const _spacing = 10;
const borderRadius = 16;
const _color = '#ececec';
const _damping = 14;
const _layout = LinearTransition.springify();
const _entering = FadeInDown.springify().damping(_damping);
const _fadeExit = FadeOut.springify().damping(_damping);

interface HoursProps {
  day: string;
  activeHours: [Date, Date][];
  setActiveHours: (hours: [Date, Date][]) => void;
  onSave: (hours: [Date, Date][]) => void;
}

export const Hours: React.FC<HoursProps> = ({
  day,
  activeHours,
  setActiveHours,
  onSave,
}) => {
  const removeHourRange = (index: number) => {
    const newHours = activeHours.filter((_, i) => i !== index);
    setActiveHours(newHours);
    onSave(newHours);
  };

  const updateStartTime = (index: number, newTime: Date) => {
    const updatedHours = [...activeHours];
    updatedHours[index] = [newTime, updatedHours[index][1]];
    setActiveHours(updatedHours);
    onSave(updatedHours);
  };

  const updateEndTime = (index: number, newTime: Date) => {
    const updatedHours = [...activeHours];
    updatedHours[index] = [updatedHours[index][0], newTime];
    setActiveHours(updatedHours);
    onSave(updatedHours);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Animated.View
      style={{ gap: _spacing }}
      layout={_layout}
      entering={_entering}
      exiting={_entering}>
      {activeHours.map(([start, end], index) => (
        <Animated.View
          layout={_layout}
          entering={_entering.damping(80).stiffness(200)}
          exiting={_fadeExit.damping(80).stiffness(200)}
          key={`hour-${index}`}
          style={{ gap: 4 }}>
          {/* Labels Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: _spacing,
            }}>
            <Text className="text-left" style={{ flex: 1, opacity: 0.4, fontSize: 12 }}>
              משעה
            </Text>
            <Text className="text-left" style={{ flex: 1, opacity: 0.4, fontSize: 12 }}>
              עד
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Time Pickers and X Button Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: _spacing,
              alignItems: 'center',
            }}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                value={start}
                mode="time"
                is24Hour={true}
                minuteInterval={1}
                displayValue={formatTime(start)}
                onChange={(date) => updateStartTime(index, date)}
                containerStyle={{
                  borderWidth: 1,
                  borderColor: _color,
                  borderRadius: borderRadius - _spacing,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
                triggerStyle={{
                  borderWidth: 1,
                  borderColor: _color,
                  borderRadius: borderRadius - _spacing,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minHeight: 36,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                labelStyle={{ fontSize: 16 }}
                pickerStyle={{ width: 80, alignSelf: 'center' }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <DateTimeField
                value={end}
                mode="time"
                is24Hour={true}
                minuteInterval={1}
                displayValue={formatTime(end)}
                onChange={(date) => updateEndTime(index, date)}
                containerStyle={{
                  borderWidth: 1,
                  borderColor: _color,
                  borderRadius: borderRadius - _spacing,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
                triggerStyle={{
                  borderWidth: 1,
                  borderColor: _color,
                  borderRadius: borderRadius - _spacing,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minHeight: 36,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                labelStyle={{ fontSize: 16 }}
                pickerStyle={{ width: 80, alignSelf: 'center' }}
              />
            </View>

            <Pressable onPress={() => removeHourRange(index)}>
              <View
                style={{
                  backgroundColor: _color,
                  height: 24,
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: borderRadius - _spacing,
                }}>
                <FontAwesome5 name="times" size={14} color="#555" />
              </View>
            </Pressable>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
};

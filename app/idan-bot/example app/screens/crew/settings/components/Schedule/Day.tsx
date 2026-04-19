import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { LinearTransition, FadeInDown } from 'react-native-reanimated';
import { Hours } from './Hours';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const _spacing = 10;
const borderRadius = 16;
const _color = '#ececec';
const _damping = 14;
const _layout = LinearTransition.springify();
const _entering = FadeInDown.springify().damping(_damping);

const startHour = 9;

const weekDays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const HEBREW_DAYS = {
  Sunday: 'ראשון',
  Monday: 'שני',
  Tuesday: 'שלישי',
  Wednesday: 'רביעי',
  Thursday: 'חמישי',
  Friday: 'שישי',
  Saturday: 'שבת',
};

type CrewSchedule = {
  id: string;
  crew_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

interface DayProps {
  day: (typeof weekDays)[number];
  dayIndex: number;
  schedules: CrewSchedule[];
  saveSchedule: (dayIndex: number, startTime: string, endTime: string) => void;
  crewMemberId: string | undefined;
  setSchedules: React.Dispatch<React.SetStateAction<CrewSchedule[]>>;
}

export const Day: React.FC<DayProps> = ({
  day,
  dayIndex,
  schedules,
  saveSchedule,
  crewMemberId,
  setSchedules,
}) => {
  const daySchedules = schedules.filter((s) => s.day_of_week === dayIndex);
  const isAnyScheduleSet = daySchedules.length > 0;
  const [isActive, setIsActive] = useState(
    isAnyScheduleSet ? daySchedules.some((schedule) => schedule.is_active === true) : false
  );

  // Convert DB time strings to Date objects
  const buildHourBlocks = (dayScheds: CrewSchedule[]) =>
    dayScheds.map((schedule) => {
      const startHourParts = schedule.start_time.split(':').map(Number);
      const endHourParts = schedule.end_time.split(':').map(Number);

      const startDate = new Date();
      startDate.setHours(startHourParts[0], startHourParts[1] || 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(endHourParts[0], endHourParts[1] || 0, 0, 0);

      return {
        id: schedule.id,
        range: [startDate, endDate] as [Date, Date],
      };
    });

  const defaultStartDate = new Date();
  defaultStartDate.setHours(startHour, 0, 0, 0);

  const defaultEndDate = new Date();
  defaultEndDate.setHours(startHour + 1, 0, 0, 0);

  const [activeHourBlocks, setActiveHourBlocks] = useState<
    { id: string | null; range: [Date, Date] }[]
  >(() => {
    const initial = buildHourBlocks(daySchedules);
    return initial.length ? initial : [];
  });

  // Sync activeHourBlocks when schedule IDs change (e.g. after save + re-fetch)
  const dayScheduleIds = daySchedules.map((s) => s.id).join(',');
  useEffect(() => {
    const updated = buildHourBlocks(daySchedules);
    setActiveHourBlocks(updated.length ? updated : []);
  }, [dayScheduleIds]);

  useEffect(() => {
    if (isAnyScheduleSet) {
      const needsUpdate = daySchedules.some((schedule) => schedule.is_active !== isActive);

      if (needsUpdate) {
        // Update local state only - don't save to database yet
        setSchedules((prev) =>
          prev.map((schedule) =>
            schedule.day_of_week === dayIndex ? { ...schedule, is_active: isActive } : schedule
          )
        );
      }
    }
  }, [isActive, dayIndex, isAnyScheduleSet, daySchedules]);

  const formatBlockTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;

  const onSave = (updatedBlocks: { id: string | null; range: [Date, Date] }[]) => {
    if (!crewMemberId) return;

    if (isActive && updatedBlocks.length > 0) {
      // Replace all schedules for this day with the updated blocks
      setSchedules((prev) => {
        const otherDays = prev.filter((s) => s.day_of_week !== dayIndex);
        const newDaySchedules = updatedBlocks.map((block) => ({
          id: block.id && !block.id.startsWith('temp-') ? block.id : `temp-${Date.now()}-${Math.random()}`,
          crew_member_id: crewMemberId,
          day_of_week: dayIndex,
          start_time: formatBlockTime(block.range[0]),
          end_time: formatBlockTime(block.range[1]),
          is_active: true,
        }));
        return [...otherDays, ...newDaySchedules];
      });
    } else if (isActive && updatedBlocks.length === 0) {
      // Remove all schedules for this day from local state
      setSchedules((prev) => prev.filter((schedule) => schedule.day_of_week !== dayIndex));
    }
  };

  const addHourRange = () => {
    const baseDate = new Date();
    baseDate.setHours(startHour, 0, 0, 0);

    const endDate = new Date(baseDate);
    endDate.setHours(baseDate.getHours() + 1, 0, 0, 0);

    if (activeHourBlocks.length === 0) {
      const newHours = [{ id: null, range: [baseDate, endDate] as [Date, Date] }];
      setActiveHourBlocks(newHours);

      if (!isActive) {
        setIsActive(true);
      }

      onSave(newHours);
    } else {
      const lastBlock = activeHourBlocks[activeHourBlocks.length - 1];
      const lastEnd = new Date(lastBlock.range[1]);
      const newStart = new Date(lastEnd);
      const newEnd = new Date(lastEnd);
      newEnd.setHours(newEnd.getHours() + 1);

      const newHours = [
        ...activeHourBlocks,
        { id: null, range: [newStart, newEnd] as [Date, Date] },
      ];
      setActiveHourBlocks(newHours);
      onSave(newHours);
    }
  };

  const activeHours = activeHourBlocks.map((block) => block.range);

  const handleHoursUpdate = (updatedHours: [Date, Date][]) => {
    const updatedBlocks = updatedHours.map((range, index) => {
      if (index < activeHourBlocks.length) {
        return { id: activeHourBlocks[index].id, range };
      }
      return { id: null, range };
    });

    setActiveHourBlocks(updatedBlocks);
    onSave(updatedBlocks);
  };

  return (
    <Animated.View
      style={{
        padding: _spacing,
        paddingVertical: _spacing / 2,
        borderWidth: 1,
        borderRadius: borderRadius,
        borderColor: _color,
        gap: _spacing,
        overflow: 'hidden',
        backgroundColor: !isActive ? _color : 'transparent',
      }}
      layout={_layout}>
      <Animated.View
        layout={_layout}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
        <Text style={{ fontSize: 16, opacity: 0.8 }}>יום {HEBREW_DAYS[day]}</Text>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          thumbColor={'white'}
          trackColor={{ true: '#4f46e5' }}
          style={{
            transform: [
              {
                scale: 0.65,
              },
            ],
          }}
        />
      </Animated.View>
      {isActive && activeHours.length > 0 && (
        <Hours
          day={day}
          activeHours={activeHours}
          setActiveHours={handleHoursUpdate}
          onSave={() => {}}
        />
      )}
      {isActive && (
        <AnimatedPressable layout={_layout} onPress={addHourRange}>
          <View
            style={{
              flexDirection: 'row',
              gap: _spacing / 2,
              padding: _spacing,
              borderRadius: borderRadius - _spacing / 2,
              backgroundColor: _color,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: _spacing / 2,
            }}>
            <Text style={{ fontSize: 14, color: '#333' }}>הוסף עוד</Text>
            <FontAwesome5 name="plus" size={14} color="#333" />
          </View>
        </AnimatedPressable>
      )}
    </Animated.View>
  );
};
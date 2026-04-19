import React, { useMemo, useState, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { toast } from 'sonner-native';

import { createDateScheduleSlot } from '@/services/crew/schedules';
import { addBreakHours } from '@/services/crew/breakDates';
import { getCrewSlotInterval } from '@/services/crew/members';
import SheetLayout from '@/components/ui/SheetLayout';
import SheetActionButton from '@/components/ui/SheetActionButton';
import TimeRangePicker from '@/components/ui/TimeRangePicker';

const applyTimeToDate = (date: dayjs.Dayjs, time: Date) => {
  return date.hour(time.getHours()).minute(time.getMinutes()).second(0).toDate();
};

const ScheduleCreateSheetScreen = () => {
  const queryClient = useQueryClient();
  const { selectedDate, selectedDateTime, crewMemberId } = useLocalSearchParams<{
    selectedDate?: string;
    selectedDateTime?: string;
    crewMemberId?: string;
  }>();

  const resolvedDate =
    selectedDate || (selectedDateTime ? dayjs(selectedDateTime).format('YYYY-MM-DD') : '');
  const resolvedDateTime = selectedDateTime
    ? dayjs(selectedDateTime)
    : dayjs(resolvedDate || undefined);
  const { data: crewInterval } = useQuery({
    queryKey: ['crewSlotInterval', crewMemberId],
    queryFn: () => getCrewSlotInterval(crewMemberId!),
    enabled: !!crewMemberId,
  });
  const minuteInterval = 1;
  const initialStart = useMemo(() => {
    if (!resolvedDateTime.isValid()) {
      return null;
    }
    return resolvedDateTime.minute(0).second(0);
  }, [resolvedDateTime]);
  const initialEnd = useMemo(() => {
    if (!initialStart) return null;
    return initialStart.add(1, 'hour');
  }, [initialStart]);
  const [startTime, setStartTime] = useState<Date | null>(initialStart?.toDate() ?? null);
  const [endTime, setEndTime] = useState<Date | null>(initialEnd?.toDate() ?? null);

  const displayDate = resolvedDate ? dayjs(resolvedDate).locale('he').format('dddd, D MMMM') : '';
  const baseDate = resolvedDate ? dayjs(resolvedDate) : dayjs();
  const startLabel = startTime ? dayjs(startTime).format('HH:mm') : '';
  const endLabel = endTime ? dayjs(endTime).format('HH:mm') : '';
  const startPickerValue = startTime || baseDate.toDate();
  const endPickerValue = endTime || baseDate.add(1, 'hour').toDate();

  const [entryType, setEntryType] = useState<'schedule' | 'break'>('schedule');
  const handleStartChange = useCallback(
    (time: Date) => {
      const nextStart = applyTimeToDate(baseDate, time);
      setStartTime(nextStart);
      if (endTime && endTime.getTime() <= nextStart.getTime()) {
        setEndTime(dayjs(nextStart).add(1, 'hour').toDate());
      }
    },
    [baseDate, endTime]
  );

  const handleEndChange = useCallback(
    (time: Date) => {
      const nextEnd = applyTimeToDate(baseDate, time);
      if (startTime && nextEnd.getTime() <= startTime.getTime()) {
        setStartTime(dayjs(nextEnd).subtract(1, 'hour').toDate());
      }
      setEndTime(nextEnd);
    },
    [baseDate, startTime]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!crewMemberId || !resolvedDate || !startTime || !endTime) {
        throw new Error('missing_data');
      }

      if (entryType === 'break') {
        const { data, error } = await addBreakHours(
          crewMemberId,
          resolvedDate,
          dayjs(startTime).format('HH:mm:ss'),
          dayjs(endTime).format('HH:mm:ss')
        );
        if (error) throw error;
        return { type: 'break', data };
      }

      const { data, error } = await createDateScheduleSlot({
        crew_member_id: crewMemberId,
        schedule_date: resolvedDate,
        start_time: dayjs(startTime).format('HH:mm:ss'),
        end_time: dayjs(endTime).format('HH:mm:ss'),
        is_active: true,
      });
      if (error) throw error;

      return { type: 'schedule', data };
    },
    onSuccess: (result) => {
      if (result?.type === 'schedule') {
        const next = result.data ? [result.data] : [];
        queryClient.setQueriesData(
          { queryKey: ['crew-date-schedule'], exact: false },
          (oldData: any) => {
            if (!oldData?.data || !Array.isArray(oldData.data)) {
              return oldData;
            }
            const filtered = oldData.data.filter((item: any) => item?.id !== result.data?.id);
            return { ...oldData, data: [...filtered, ...next] };
          }
        );
        queryClient.invalidateQueries({ queryKey: ['crew-date-schedule'], exact: false });
      }

      queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['breakDates'], exact: false });
      toast.success(entryType === 'break' ? 'הפסקה נוספה' : 'שעות נוספו');
      router.back();
    },
    onError: () => {
      toast.error('לא ניתן לשמור שעות');
    },
  });

  const canConfirm = !!crewMemberId && !!resolvedDate && !!startTime && !!endTime;

  return (
    <SheetLayout title="הוספת זמינות" subtitle={displayDate}>
      <View className="mt-6 gap-3">
        <TimeRangePicker
          startValue={startPickerValue}
          endValue={endPickerValue}
          startLabel={startLabel}
          endLabel={endLabel}
          minuteInterval={minuteInterval}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
        />

        <View className="flex-row rounded-full bg-slate-100 p-1">
          <Pressable
            onPress={() => setEntryType('schedule')}
            className={`flex-1 items-center rounded-full py-2 ${
              entryType === 'schedule' ? 'bg-black' : 'bg-transparent'
            }`}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Text className={entryType === 'schedule' ? 'text-white' : 'text-slate-700'}>
              שעות עבודה
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setEntryType('break')}
            className={`flex-1 items-center rounded-full py-2 ${
              entryType === 'break' ? 'bg-black' : 'bg-transparent'
            }`}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Text className={entryType === 'break' ? 'text-white' : 'text-slate-700'}>הפסקה</Text>
          </Pressable>
        </View>

        <SheetActionButton
          label="אישור"
          loadingLabel="מוסיף..."
          variant="primary"
          disabled={!canConfirm}
          isLoading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />

        <SheetActionButton label="ביטול" onPress={() => router.back()} />
      </View>
    </SheetLayout>
  );
};

export default ScheduleCreateSheetScreen;

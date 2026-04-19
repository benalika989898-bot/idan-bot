import React from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { fetchCrewDateSchedules, updateDateScheduleForDate } from '@/services/crew/schedules';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import SheetLayout from '@/components/ui/SheetLayout';
import SheetActionButton from '@/components/ui/SheetActionButton';

const ScheduleActionSheetScreen = () => {
  const queryClient = useQueryClient();
  const { setSelectedScheduleId } = useScheduleSelectionStore();
  const {
    scheduleId: scheduleIdParam,
    scheduleDate: scheduleDateParam,
    startTime: startTimeParam,
    endTime: endTimeParam,
    crewMemberId: crewMemberIdParam,
  } = useLocalSearchParams<{
    scheduleId?: string | string[];
    scheduleDate?: string | string[];
    startTime?: string | string[];
    endTime?: string | string[];
    crewMemberId?: string | string[];
  }>();

  const scheduleId = Array.isArray(scheduleIdParam) ? scheduleIdParam[0] : scheduleIdParam;
  const scheduleDate = Array.isArray(scheduleDateParam) ? scheduleDateParam[0] : scheduleDateParam;
  const startTime = Array.isArray(startTimeParam) ? startTimeParam[0] : startTimeParam;
  const endTime = Array.isArray(endTimeParam) ? endTimeParam[0] : endTimeParam;
  const crewMemberId = Array.isArray(crewMemberIdParam) ? crewMemberIdParam[0] : crewMemberIdParam;

  const deleteMutation = useMutation({
    onMutate: async () => {
      if (!scheduleDate || !scheduleId) return {};
      await queryClient.cancelQueries({ queryKey: ['crew-date-schedule'], exact: false });

      const previous = queryClient.getQueriesData({ queryKey: ['crew-date-schedule'], exact: false });

      queryClient.setQueriesData(
        { queryKey: ['crew-date-schedule'], exact: false },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.filter((item) => item?.id !== scheduleId);
          }
          if (Array.isArray(oldData?.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((item: any) => item?.id !== scheduleId),
            };
          }
          return oldData;
        }
      );

      return { previous };
    },
    mutationFn: async () => {
      if (!crewMemberId || !scheduleDate || !scheduleId) {
        throw new Error('missing_data');
      }

      const { data: existing, error } = await fetchCrewDateSchedules(
        crewMemberId,
        scheduleDate,
        scheduleDate
      );
      if (error) throw error;

      const next = (existing || []).filter((schedule) => schedule.id !== scheduleId);
      const payload = next.map((schedule) => ({
        crew_member_id: crewMemberId,
        schedule_date: scheduleDate,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: true,
      }));

      const { error: updateError } = await updateDateScheduleForDate(
        crewMemberId,
        scheduleDate,
        payload
      );
      if (updateError) throw updateError;

      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueriesData(
        { queryKey: ['crew-date-schedule'], exact: false },
        (oldData: any) => {
          if (!oldData?.data || !Array.isArray(oldData.data)) {
            return oldData;
          }
          const filtered = oldData.data.filter((item: any) => item?.schedule_date !== scheduleDate);
          return { ...oldData, data: [...filtered, ...next] };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['crew-date-schedule'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      toast.success('בלוק נמחק');
      router.back();
    },
    onError: (_error, _variables, context: any) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]: [unknown, unknown]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('לא ניתן למחוק בלוק');
    },
  });

  const handleDelete = () => {
    Alert.alert('מחיקת בלוק', 'למחוק את בלוק השעות הזה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const badgeLabel = `${startTime || '--:--'} - ${endTime || '--:--'}`;

  return (
    <SheetLayout title="בלוק שעות" subtitle={scheduleDate || '--'} badgeLabel={badgeLabel}>
      <View className="mt-6 gap-3">
        <SheetActionButton
          label="שינוי זמינות"
          variant="primary"
          onPress={() => {
            if (scheduleId) {
              setSelectedScheduleId(scheduleId);
            }
            router.back();
          }}
        />

        <SheetActionButton
          label="מחיקת בלוק"
          loadingLabel="מוחק..."
          isLoading={deleteMutation.isPending}
          onPress={handleDelete}
        />

        <SheetActionButton label="ביטול" onPress={() => router.back()} />
      </View>
    </SheetLayout>
  );
};

export default ScheduleActionSheetScreen;

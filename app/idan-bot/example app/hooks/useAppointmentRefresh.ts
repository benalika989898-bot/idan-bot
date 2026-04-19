import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

export const useAppointmentRefresh = (
  selectedCrewMember: User | null,
  selectedDate: string,
  selectedAppointmentType: AppointmentType | null,
  setIsRefreshing: (refreshing: boolean) => void
) => {
  const queryClient = useQueryClient();

  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('🔄 Pull to refresh triggered');

    try {
      await queryClient.invalidateQueries({ queryKey: ['activeCrewMembers'] });
      await queryClient.invalidateQueries({ queryKey: ['appointmentTypes'] });

      if (selectedCrewMember?.id) {
        await queryClient.invalidateQueries({ queryKey: ['allCrewSchedules'] });
        await queryClient.invalidateQueries({ queryKey: ['crewSchedule', selectedCrewMember.id] });
      }

      if (selectedCrewMember?.id && selectedAppointmentType) {
        await queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
      }

      if (selectedCrewMember?.id && selectedDate && selectedAppointmentType) {
        await queryClient.invalidateQueries({
          queryKey: [
            'availableSlots',
            selectedCrewMember.id,
            selectedDate,
            selectedAppointmentType.id,
          ],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, selectedCrewMember?.id, selectedDate, selectedAppointmentType?.id, setIsRefreshing]);

  return {
    handlePullRefresh,
  };
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { withSpring } from 'react-native-reanimated';
import { createAppointmentWithTickets, CreateAppointmentData } from '@/services/crew/appointments';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';
import { parseTimeSlot } from '@/utils/appointment';

export const useAppointmentBooking = (
  selectedCrewMember: User | null,
  selectedAppointmentType: AppointmentType | null,
  selectedDate: string,
  selectedTimeSlot: string,
  setSelectedTimeSlot: (slot: string) => void,
  setCurrentStep: (step: number) => void,
  pagerRef: React.RefObject<any>,
  progressValue: any
) => {
  const queryClient = useQueryClient();

  const createAppointmentMutation = useMutation({
    mutationFn: createAppointmentWithTickets,
    onSuccess: () => {
      router.back();
      setTimeout(() => toast.success('התור נקבע בהצלחה!'), 300);
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      // Invalidate ticket balance to show updated balance after booking
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
    },
    onError: (error: any) => {
      if (error?.userFriendly) {
        toast.error(error.message);
        if (error.code === 'P0001' || error.code === '23505' || error.code === 'BREAK_CONFLICT') {
          setSelectedTimeSlot('');
          queryClient.invalidateQueries({
            queryKey: [
              'availableSlots',
              selectedCrewMember?.id,
              selectedDate,
              selectedAppointmentType?.id,
            ],
          });
          queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });

          const timeSelectionStep = 3;
          setCurrentStep(timeSelectionStep);
          pagerRef.current?.setPage(timeSelectionStep);
          progressValue.value = withSpring(timeSelectionStep);

          setTimeout(() => {
            toast.info('המידע עודכן - אנא בחר שעה אחרת');
          }, 500);
        }
      } else {
        toast.error('לא ניתן ליצור את התור. אנא גרור כדי לרענן ונסה שוב.');
      }
    },
  });

  const canBookAppointment = (user: User | null) => {
    return (
      selectedCrewMember !== null &&
      selectedAppointmentType !== null &&
      selectedDate !== '' &&
      selectedTimeSlot !== '' &&
      user?.id
    );
  };

  const handleBookAppointment = (user: User | null, useTicket?: boolean) => {
    if (
      !canBookAppointment(user) ||
      !selectedAppointmentType ||
      !selectedTimeSlot ||
      !user?.id ||
      !selectedCrewMember?.id
    )
      return;

    const { startTime, endTime } = parseTimeSlot(
      selectedTimeSlot,
      selectedAppointmentType.duration_minutes
    );

    const appointmentData: CreateAppointmentData = {
      appointment_type_id: selectedAppointmentType.id,
      appointment_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      crew_member_id: selectedCrewMember.id,
      customer_id: user.id,
      use_ticket: useTicket,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  return {
    createAppointmentMutation,
    isBooking: createAppointmentMutation.isPending,
    canBookAppointment,
    handleBookAppointment,
  };
};

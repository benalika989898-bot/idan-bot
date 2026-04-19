import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

export const useWaitingList = (
  user: User | null,
  selectedAppointmentType: AppointmentType | null,
  selectedCrewMember: User | null
) => {
  const queryClient = useQueryClient();

  const { data: existingWaitingList = [] } = useQuery({
    queryKey: ['userWaitingList', user?.id, selectedAppointmentType?.id, selectedCrewMember?.id],
    queryFn: async () => {
      if (!user?.id || !selectedAppointmentType?.id) return [];

      const { data, error } = await supabase
        .from('waiting_list')
        .select('preferred_date, crew_member_id')
        .eq('customer_id', user.id)
        .eq('appointment_type_id', selectedAppointmentType.id)
        .eq('status', 'active')
        .eq('crew_member_id', selectedCrewMember?.id || null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!selectedAppointmentType?.id,
  });

  const handleWaitingListAction = async (date: string, isAlreadyRegistered: boolean) => {
    if (!user || !selectedAppointmentType) {
      Alert.alert('שגיאה', 'נתונים חסרים לרישום');
      return;
    }

    try {
      if (isAlreadyRegistered) {
        // Unregister from waiting list
        const { error } = await supabase
          .from('waiting_list')
          .delete()
          .eq('customer_id', user.id)
          .eq('preferred_date', date)
          .eq('appointment_type_id', selectedAppointmentType.id)
          .eq('crew_member_id', selectedCrewMember?.id || null)
          .eq('status', 'active');

        if (error) throw error;

        toast.success('הוסרת מרשימת המתנה בהצלחה');
      } else {
        // Register for waiting list
        const waitingListEntry = {
          customer_id: user.id,
          preferred_date: date,
          appointment_type_id: selectedAppointmentType.id,
          crew_member_id: selectedCrewMember?.id || null,
          status: 'active',
        };

        const { error } = await supabase.from('waiting_list').insert([waitingListEntry]);

        if (error) throw error;

        toast.success('נרשמת לרשימת המתנה! תקבל הודעה כשמקום יתפנה.');
      }

      // Refresh the waiting list query
      queryClient.invalidateQueries({
        queryKey: ['userWaitingList', user.id, selectedAppointmentType.id, selectedCrewMember?.id],
      });
    } catch (error) {
      console.error('Error with waiting list action:', error);
      const action = isAlreadyRegistered ? 'להסיר אותך מרשימת המתנה' : 'להוסיף אותך לרשימת המתנה';
      toast.error(`לא הצלחנו ${action}`);
    }
  };

  return {
    existingWaitingList,
    handleWaitingListAction,
  };
};
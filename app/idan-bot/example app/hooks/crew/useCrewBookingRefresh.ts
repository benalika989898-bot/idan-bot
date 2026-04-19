import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { User } from '@/types/auth';
import { AppointmentType } from '@/types/appointments';

interface UseCrewBookingRefreshProps {
  userId?: string;
  selectedCustomer?: User | null;
  selectedAppointmentType?: AppointmentType | null;
  selectedDate?: string;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
}

export const useCrewBookingRefresh = ({
  userId,
  selectedCustomer,
  selectedAppointmentType,
  selectedDate,
  isRefreshing,
  setIsRefreshing,
}: UseCrewBookingRefreshProps) => {
  const queryClient = useQueryClient();

  // Focus-based refresh
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Crew booking screen focused - refreshing data...');
      
      // Refresh customers and appointment types
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['appointmentTypes'] });
      
      // Refresh crew schedule
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['crewSchedule', userId] });
      }
      
      // Refresh availability if we have selections
      if (selectedCustomer?.id && selectedAppointmentType) {
        queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
      }
      
      // Refresh current time slots if we're viewing them
      if (userId && selectedDate && selectedAppointmentType) {
        queryClient.invalidateQueries({ 
          queryKey: ['availableSlots', userId, selectedDate, selectedAppointmentType.id] 
        });
      }
    }, [queryClient, userId, selectedCustomer?.id, selectedDate, selectedAppointmentType?.id])
  );

  // Pull to refresh function
  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('🔄 Pull to refresh triggered - crew booking');
    
    try {
      // Refresh all relevant queries based on current step
      await queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      await queryClient.invalidateQueries({ queryKey: ['appointmentTypes'] });
      
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['crewSchedule', userId] });
      }
      
      if (selectedCustomer?.id && selectedAppointmentType) {
        await queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
      }
      
      if (userId && selectedDate && selectedAppointmentType) {
        await queryClient.invalidateQueries({ 
          queryKey: ['availableSlots', userId, selectedDate, selectedAppointmentType.id] 
        });
      }
      
      // Wait a bit for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, userId, selectedCustomer?.id, selectedDate, selectedAppointmentType?.id, setIsRefreshing]);

  return {
    handlePullRefresh,
    isRefreshing,
  };
};
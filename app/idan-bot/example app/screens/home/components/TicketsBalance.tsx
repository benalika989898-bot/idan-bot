import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getCustomerTicketBalance } from '@/services/crew/tickets';
import { useAuth } from '@/contexts/AuthContext';

const TicketsBalance = () => {
  const { user } = useAuth();

  const {
    data: ticketBalance,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const { data, error } = await getCustomerTicketBalance(user.id);
      if (error) {
        throw new Error(error.message || 'Failed to fetch tickets');
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 1000, // 10 seconds for more frequent updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds when component is active
  });

  // Only show if user has tickets or is loading (to avoid flash)
  if (!isLoading && (!ticketBalance || ticketBalance === 0)) {
    return null;
  }

  if (error || !user) {
    return null;
  }

  return (
    <View className=" flex-row items-center  justify-center gap-2 rounded-full  bg-white/20 px-3 py-2 backdrop-blur-sm">
      <Ionicons name="ticket" size={20} color="white" />
      <Text className="text-base font-semibold text-white">
        {isLoading ? '...' : ticketBalance || 0}
      </Text>
    </View>
  );
};

export default TicketsBalance;

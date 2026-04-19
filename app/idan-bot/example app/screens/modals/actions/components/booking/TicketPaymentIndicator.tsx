import React from 'react';
import { Switch, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TicketPaymentIndicatorProps {
  ticketBalance: number;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const TicketPaymentIndicator: React.FC<TicketPaymentIndicatorProps> = ({
  ticketBalance,
  value,
  onValueChange,
}) => {
  if (!ticketBalance || ticketBalance <= 0) {
    return null;
  }

  return (
    <View
      className={`flex-row items-center justify-between rounded-xl px-4 py-3 ${
        value ? 'bg-purple-100' : 'bg-neutral-200/70'
      }`}>
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            value ? 'bg-purple-200' : 'bg-neutral-300/80'
          }`}>
          <Ionicons name="ticket" size={18} color={value ? '#7E22CE' : '#525252'} />
        </View>
        <View className="flex-1 items-start">
          <Text
            className={`text-left text-base font-semibold ${
              value ? 'text-purple-900' : 'text-neutral-800'
            }`}>
            השתמש/י בכרטיסיה
          </Text>
          <Text className={`text-left text-sm ${value ? 'text-purple-700' : 'text-neutral-500'}`}>
            {ticketBalance} כרטיסים זמינים
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#A3A3A3', true: '#A855F7' }}
      />
    </View>
  );
};

export default TicketPaymentIndicator;

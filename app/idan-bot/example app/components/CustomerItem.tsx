import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface CustomerItemProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
  showDivider?: boolean;
  isSelected?: boolean;
}

export const CustomerItem: React.FC<CustomerItemProps> = ({
  customer,
  onPress,
  showDivider = true,
  isSelected = false,
}) => {
  return (
    <Pressable
      onPress={() => onPress(customer)}
      className={`py-4 ${showDivider ? 'border-b border-gray-100' : ''} ${isSelected ? 'bg-gray-50' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image
            source={{
              uri: customer.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={{ height: 40, width: 40, borderRadius: 20 }}
            contentFit="cover"
            className="bg-gray-200"
          />
          <View>
            <Text className="text-left text-lg font-semibold text-black">
              {customer.full_name || 'לקוח ללא שם'}
            </Text>
            {!!customer.phone && <Text className="text-sm text-gray-500">{customer.phone}</Text>}
          </View>
        </View>
        <Ionicons name="chevron-back" size={16} color="#d1d5db" />
      </View>
    </Pressable>
  );
};

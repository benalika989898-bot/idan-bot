import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { toast } from 'sonner-native';
import { fetchCustomers } from '@/services/crew/profiles';
import { CustomerItem } from '@/components/CustomerItem';
import { useQuery } from '@tanstack/react-query';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const SelectCustomerScreen = () => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: customers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await fetchCustomers();
      if (error) {
        toast.error('לא ניתן לטעון את רשימת הלקוחות');
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    if (!searchQuery.trim()) {
      return customers;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );
    return filtered;
  }, [customers, searchQuery]);

  const handleCustomerSelect = (customer: Customer) => {
    router.dismiss();
    router.navigate({
      pathname: '/(modal)/actions/book-appointment',
      params: { selectedCustomer: JSON.stringify(customer) },
    });
  };

  const renderCustomerItem = ({ item, index }: { item: Customer; index: number }) => (
    <CustomerItem
      customer={item}
      onPress={handleCustomerSelect}
      showDivider={index < filteredCustomers.length - 1}
    />
  );

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Ionicons name="warning-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text className="mb-2 text-center text-lg font-medium text-gray-900">
          שגיאה בטעינת הלקוחות
        </Text>
        <Text className="mb-4 text-center text-sm text-gray-500">
          לא ניתן לטעון את רשימת הלקוחות כרגע
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, direction: 'rtl' }} className="bg-white">
      {/* Search Input */}
      <View className="p-6">
        <View className="flex-row items-center rounded-lg border border-gray-200 bg-gray-50 p-3">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="חיפוש לקוח לפי שם או טלפון"
            className="mr-3 flex-1 text-right"
            style={{ textAlign: 'right' }}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Customer List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-4 py-20">
          <ActivityIndicator size="large" color="#000" />
          <Text className="text-gray-500">טוען לקוחות...</Text>
        </View>
      ) : filteredCustomers.length > 0 ? (
        <FlashList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          estimatedItemSize={64}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center py-20">
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text className="mt-4 text-lg text-gray-500">
            {searchQuery ? 'לא נמצאו לקוחות' : 'אין לקוחות רשומים'}
          </Text>
          <Text className="mt-2 px-8 text-center text-sm text-gray-400">
            {searchQuery
              ? 'נסה לחפש במילות חיפוש אחרות'
              : 'לקוחות יופיעו כאן לאחר שיירשמו לאפליקציה'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default SelectCustomerScreen;

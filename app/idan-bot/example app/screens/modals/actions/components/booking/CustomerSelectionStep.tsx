import { CustomerItem } from '@/components/CustomerItem';
import { User } from '@/types/auth';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';

interface CustomerSelectionStepProps {
  selectedCustomer: User | null;
  onCustomerSelect: (customer: User) => void;
  customers?: User[];
  loading?: boolean;
  refreshControl?: React.ReactElement;
}

const CustomerSelectionStep: React.FC<CustomerSelectionStepProps> = ({
  selectedCustomer,
  onCustomerSelect,
  customers = [],
  loading = false,
  refreshControl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter((customer) => {
      const fullName = ((customer as any).full_name || '').toLowerCase();
      const phone = (customer as any).phone || '';
      return fullName.includes(query) || phone.includes(searchQuery);
    });
  }, [customers, searchQuery]);

  return (
    <View className="flex-1" style={{ direction: 'rtl' }}>
      <View className="p-6">
        <View className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
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

      {loading ? (
        <View className="flex-1 items-center justify-center gap-4 py-20">
          <ActivityIndicator size="large" color="#000" />
          <Text className="text-gray-500">טוען לקוחות...</Text>
        </View>
      ) : filteredCustomers.length > 0 ? (
        <FlashList
          data={filteredCustomers}
          renderItem={({ item, index }) => (
            <CustomerItem
              customer={item as any}
              key={(item as any).id}
              onPress={onCustomerSelect}
              showDivider={index < filteredCustomers.length - 1}
              isSelected={selectedCustomer?.id === (item as any).id}
            />
          )}
          estimatedItemSize={64}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          contentContainerStyle={{ flexGrow: 1 }}>
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
        </ScrollView>
      )}
    </View>
  );
};

export default CustomerSelectionStep;

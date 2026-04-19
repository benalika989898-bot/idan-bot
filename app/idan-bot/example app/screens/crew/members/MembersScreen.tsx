import Fab from '@/components/ui/Fab';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllProfiles } from '@/services/crew/profiles';
import { CustomerProfile } from '@/types/profiles';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { normalizePhoneForCall, normalizePhoneForWhatsApp } from '@/utils/formatPhoneNumber';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatJoinDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleLabel = (role: string) => {
  if (role === 'admin') return 'בעלים';
  if (role === 'crew') return 'איש צוות';
  return 'לקוח';
};

const getRoleBadgeStyle = (role: string) => {
  if (role === 'admin') return 'bg-amber-100 text-amber-700';
  if (role === 'crew') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
};

const rolePriority = (role: string) => {
  if (role === 'admin') return 0;
  if (role === 'crew') return 1;
  return 2;
};

const CustomerCard: React.FC<{ customer: CustomerProfile; onPress?: () => void }> = ({
  customer,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 rounded-lg bg-white p-4 "
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          {customer.avatar_url ? (
            <Image
              source={{ uri: customer.avatar_url }}
              style={{ height: 48, width: 48, borderRadius: 24 }}
              contentFit="cover"
              className="bg-gray-200"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Text className="text-lg font-semibold text-gray-600">
                {getInitials(customer.full_name)}
              </Text>
            </View>
          )}

          <View className="flex-1 gap-1">
            <Text className="text-left text-lg font-semibold text-gray-900" numberOfLines={1}>
              {customer.full_name}
            </Text>
            <View className="self-start rounded-full  py-0.5">
              <View className={`rounded-full px-2 py-0.5 ${getRoleBadgeStyle(customer.role)}`}>
                <Text className="text-xs font-medium">{getRoleLabel(customer.role)}</Text>
              </View>
            </View>
            <Text className=" text-left text-xs text-gray-400">
              הצטרף ב-{formatJoinDate(customer.created_at)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            className="rounded-full bg-green-100 p-2"
            onPress={() => {
              const wa = normalizePhoneForWhatsApp(customer.phone);
              if (wa) {
                Linking.openURL(`https://wa.me/${wa}`);
              }
            }}>
            <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
          </Pressable>
          <Pressable
            className="rounded-full bg-blue-100 p-2"
            onPress={() => {
              const tel = normalizePhoneForCall(customer.phone);
              if (tel) {
                Linking.openURL(`tel:${tel}`);
              }
            }}>
            <Ionicons name="call" size={16} color="#3B82F6" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const EmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => (
  <View className="flex-1 items-center justify-center px-8 py-20">
    <Ionicons name="people-outline" size={64} color="#D1D5DB" style={{ marginBottom: 16 }} />
    <Text
      className="mb-2 text-center text-lg font-medium text-gray-900"
      style={{ direction: 'rtl' }}>
      {searchQuery ? 'לא נמצאו לקוחות' : 'אין לקוחות רשומים'}
    </Text>
    <Text className="text-center text-sm text-gray-500" style={{ direction: 'rtl' }}>
      {searchQuery ? 'נסה לחפש במילות חיפוש אחרות' : 'לקוחות יופיעו כאן לאחר שיירשמו לאפליקציה'}
    </Text>
  </View>
);

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const {
    data: customers,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await fetchAllProfiles();
      if (error) {
        throw new Error(error.message || 'Failed to fetch customers');
      }
      return data as CustomerProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredCustomers = (() => {
    if (!customers) return [];

    if (!searchQuery.trim()) {
      return user?.role === 'crew'
        ? customers.filter((customer) => customer.role === 'customer')
        : customers;
    }

    return customers.filter((customer) => {
      if (user?.role === 'crew' && customer.role !== 'customer') {
        return false;
      }

      return (
        (customer.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone || '').includes(searchQuery)
      );
    });
  })();

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const roleDiff = rolePriority(a.role) - rolePriority(b.role);
    if (roleDiff !== 0) return roleDiff;
    return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
  });

  const handleCustomerPress = (customer: Customer) => {
    router.push(`/(crew)/members/${customer.id}`);
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <CustomerCard customer={item} onPress={() => handleCustomerPress(item)} />
  );

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Ionicons name="warning-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text
          className="mb-2 text-center text-lg font-medium text-gray-900"
          style={{ direction: 'rtl' }}>
          שגיאה בטעינת הלקוחות
        </Text>
        <Text className="mb-4 text-center text-sm text-gray-500" style={{ direction: 'rtl' }}>
          לא ניתן לטעון את רשימת הלקוחות כרגע
        </Text>
        <Pressable onPress={() => refetch()} className="rounded-lg bg-black px-6 py-3">
          <Text className="text-center font-medium text-white">נסה שוב</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `לקוחות${customers?.length ? `(${customers.length})` : ''}` }} />
      <Stack.SearchBar
        placeholder="חיפוש לקוח לפי שם או טלפון..."
        onChangeText={(e) => setSearchQuery(e.nativeEvent.text)}
        hideWhenScrolling={true}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-gray-500" style={{ direction: 'rtl' }}>
            טוען לקוחות...
          </Text>
        </View>
      ) : sortedCustomers.length === 0 ? (
        <EmptyState searchQuery={searchQuery} />
      ) : (
        <FlashList
          data={sortedCustomers}
          renderItem={renderCustomer}
          estimatedItemSize={80}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom, direction: 'rtl' }}
          keyExtractor={(item) => item.id}
        />
      )}

      {(user?.role === 'admin' || user?.role === 'crew') && (
        <View style={{ bottom: insets.bottom * 1.1 }} className="absolute left-6 z-50">
          <Fab onPress={() => router.push('/(crew)/members/add-member')} icon="add" />
        </View>
      )}
    </>
  );
}

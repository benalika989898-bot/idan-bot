import { AppointmentProductSaleRecord } from '@/services/crew/appointmentSales';
import { Appointment } from '@/types/appointments';
import { TicketTransaction } from '@/types/tickets';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export type HistoryItem =
  | { id: string; type: 'appointment'; date: Date; data: Appointment }
  | { id: string; type: 'ticket'; date: Date; data: TicketTransaction }
  | { id: string; type: 'sale'; date: Date; data: AppointmentProductSaleRecord };

type MemberHistoryListProps = {
  historyItems: HistoryItem[];
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  header: React.ReactElement;
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

const getStatusColor = (appointment: Appointment) => {
  const dt = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  return dt > new Date() ? '#3B82F6' : '#22C55E';
};

const getStatusText = (appointment: Appointment) => {
  const dt = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  return dt > new Date() ? 'מתוכנן' : 'הושלם';
};

export default function MemberHistoryList({
  historyItems,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  header,
}: MemberHistoryListProps) {
  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    if (item.type === 'appointment') {
      const appointment = item.data;
      return (
        <View className="flex-row items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-left text-sm font-medium text-gray-900">
              {appointment.appointment_type?.name || 'שירות לא ידוע'}
            </Text>
            <Text className="text-left text-xs text-gray-400">
              {formatDate(appointment.appointment_date)} • {appointment.start_time}
              {appointment.crew_member ? ` • ${appointment.crew_member.full_name}` : ''}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text className="text-sm font-semibold text-gray-900">
              ₪{appointment.appointment_type?.price || 0}
            </Text>
            <View className="flex-row items-center gap-1">
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: getStatusColor(appointment) }}
              />
              <Text className="text-xs text-gray-400">{getStatusText(appointment)}</Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'ticket') {
      const transaction = item.data;
      return (
        <View className="flex-row items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-left text-sm font-medium text-gray-900">הוספת כרטיסים</Text>
            <Text className="text-left text-xs text-gray-400">
              {formatDate(transaction.created_at)}
              {transaction.granter ? ` • ${transaction.granter.full_name}` : ''}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text className="text-sm font-semibold text-purple-600">
              +{Math.abs(transaction.amount)}
            </Text>
            {transaction.price != null && transaction.price > 0 && (
              <Text className="text-xs text-gray-400">₪{transaction.price}</Text>
            )}
          </View>
        </View>
      );
    }

    const sale = item.data;
    return (
      <View className="flex-row items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-left text-sm font-medium text-gray-900">
            {sale.product?.name || 'מוצר'}
          </Text>
          <Text className="text-left text-xs text-gray-400">
            {formatDate(sale.created_at)}
            {sale.quantity > 1 ? ` • x${sale.quantity}` : ''}
          </Text>
        </View>
        <View className="items-end gap-0.5">
          <Text className="text-sm font-semibold text-gray-900">
            ₪{sale.total_price || sale.unit_price * sale.quantity}
          </Text>
          <Text className="text-xs text-gray-400">מוצר</Text>
        </View>
      </View>
    );
  };

  return (
    <FlashList
      data={historyItems}
      renderItem={renderHistoryItem}
      keyExtractor={(item) => item.id}
      estimatedItemSize={88}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40, backgroundColor: '#ffffff' }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View className="items-center gap-2 px-6 py-8">
          <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
          <Text className="text-sm text-gray-400">אין היסטוריה עדיין</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="items-center py-4">
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : (
          <View style={{ height: 16 }} />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

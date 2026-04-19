import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useProfile } from '@/hooks/useProfile';
import MemberHistoryList, { HistoryItem } from './components/MemberHistoryList';
import { fetchCustomerAppointments } from '@/services/crew/appointments';
import { AppointmentProductSaleRecord, fetchProductSalesByCustomer } from '@/services/crew/appointmentSales';
import { fetchAllProfiles } from '@/services/crew/profiles';
import { getCustomerTicketBalance, getCustomerTicketTransactions } from '@/services/crew/tickets';
import { CustomerProfile } from '@/types/profiles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { normalizePhoneForCall, normalizePhoneForWhatsApp } from '@/utils/formatPhoneNumber';
import { toast } from 'sonner-native';

const APPOINTMENT_HISTORY_PAGE_SIZE = 20;

const getInitials = (name: string) =>
  name.split(' ').map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2);

export default function MemberDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();
  const canEditAvatar = user?.role === 'admin';
  const canEditRole = user?.role === 'admin';
  const canManageTickets = user?.role === 'admin';
  const canEditBlock = user?.role === 'admin';
  const [selectedRole, setSelectedRole] = useState<'customer' | 'crew' | 'admin'>('customer');
  const [isBlocked, setIsBlocked] = useState(false);
  const [displayOrderInput, setDisplayOrderInput] = useState('');
  const avatarUpdateRef = useRef(false);

  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: customersError,
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

  const member = customers?.find((customer) => customer.id === id);
  const canEditOrder =
    user?.role === 'admin' && (member?.role === 'crew' || member?.role === 'admin');
  const isCrewViewer = user?.role === 'crew';
  const isRestrictedMember = isCrewViewer && member?.role !== 'customer';

  const {
    isUploading: isUploadingAvatar,
    isUpdating: isUpdatingProfile,
    uploadProfileImage,
    updateProfile,
  } = useProfile({
    profileId: typeof id === 'string' ? id : undefined,
    onSuccess: () => {
      if (avatarUpdateRef.current) {
        toast.success('תמונת הפרופיל עודכנה בהצלחה');
      }
    },
    onError: () => {
      if (avatarUpdateRef.current) {
        toast.error('שגיאה בעדכון תמונת הפרופיל');
      }
    },
  });

  const handleAvatarEdit = async () => {
    if (!canEditAvatar) return;
    avatarUpdateRef.current = true;
    try {
      await uploadProfileImage();
    } finally {
      avatarUpdateRef.current = false;
    }
  };

  const roleOptions: { value: 'customer' | 'crew' | 'admin'; label: string }[] = [
    { value: 'customer', label: 'לקוח' },
    { value: 'crew', label: 'איש צוות' },
    { value: 'admin', label: 'בעלים' },
  ];

  const handleRoleSelect = (role: 'customer' | 'crew' | 'admin') => {
    if (!canEditRole) return;
    setSelectedRole(role);
  };

  useEffect(() => {
    if (member?.role) {
      setSelectedRole(member.role as 'customer' | 'crew' | 'admin');
    }
  }, [member?.role]);

  useEffect(() => {
    if (typeof member?.is_blocked === 'boolean') {
      setIsBlocked(member.is_blocked);
    } else {
      setIsBlocked(false);
    }
  }, [member?.is_blocked]);

  useEffect(() => {
    if (typeof member?.display_order === 'number') {
      setDisplayOrderInput(member.display_order.toString());
    } else {
      setDisplayOrderInput('');
    }
  }, [member?.display_order]);

  const hasRoleChange = member?.role && selectedRole !== member.role;
  const hasOrderChange = (() => {
    const currentOrder = typeof member?.display_order === 'number' ? member.display_order : null;
    const nextOrder = displayOrderInput.trim() === '' ? null : Number(displayOrderInput);
    if (nextOrder === null) return currentOrder !== null;
    return !Number.isNaN(nextOrder) && currentOrder !== nextOrder;
  })();

  const handleRoleSave = useCallback(async () => {
    if (!canEditRole || !member?.id || !hasRoleChange) return;
    try {
      await updateProfile({ role: selectedRole });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('התפקיד עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('שגיאה בעדכון התפקיד');
    }
  }, [canEditRole, hasRoleChange, member?.id, queryClient, selectedRole, updateProfile]);

  const handleBlockedToggle = async (nextValue: boolean) => {
    if (!canEditBlock || !member?.id) return;
    setIsBlocked(nextValue);
    try {
      await updateProfile({ is_blocked: nextValue });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(nextValue ? 'המשתמש נחסם' : 'החסימה הוסרה');
    } catch (error) {
      console.error('Error updating blocked status:', error);
      setIsBlocked(!nextValue);
      toast.error('שגיאה בעדכון סטטוס החסימה');
    }
  };

  const handleOrderSave = async () => {
    if (!canEditOrder || !member?.id || !hasOrderChange) return;
    const rawValue = displayOrderInput.trim();
    const parsedValue = rawValue === '' ? null : Number(rawValue);
    if (parsedValue !== null && (!Number.isInteger(parsedValue) || parsedValue < 0)) {
      toast.error('יש להזין מספר שלם וחיובי');
      return;
    }

    try {
      await updateProfile({ display_order: parsedValue });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['activeCrewMembers'] });
      toast.success('הסדר עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating display order:', error);
      toast.error('שגיאה בעדכון הסדר');
    }
  };

  useEffect(() => {
    const isSaveDisabled = !canEditRole || !hasRoleChange || isUpdatingProfile;
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
      ),
      headerLeft: canEditRole
        ? () => (
            <Pressable onPress={handleRoleSave} disabled={isSaveDisabled}>
              <Text
                className={`text-base font-semibold ${
                  isSaveDisabled ? 'text-gray-400' : 'text-black'
                }`}>
                {isUpdatingProfile ? 'שומר...' : 'שמור'}
              </Text>
            </Pressable>
          )
        : () => null,
    });
  }, [canEditRole, handleRoleSave, hasRoleChange, isUpdatingProfile, navigation]);

  const {
    data: appointmentsPages,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['customer-appointments', id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid customer ID');
      }
      const { data, error } = await fetchCustomerAppointments(id, {
        limit: APPOINTMENT_HISTORY_PAGE_SIZE,
        offset: pageParam,
      });
      if (error) {
        throw new Error(error.message || 'Failed to fetch appointments');
      }
      return (data || []) as Appointment[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < APPOINTMENT_HISTORY_PAGE_SIZE
        ? undefined
        : allPages.length * APPOINTMENT_HISTORY_PAGE_SIZE,
    enabled: !!id && typeof id === 'string',
    staleTime: 5 * 60 * 1000,
  });

  const appointments = useMemo(
    () => appointmentsPages?.pages.flatMap((page) => page) || [],
    [appointmentsPages]
  );

  const {
    data: ticketBalance,
    isLoading: isLoadingTickets,
    error: ticketsError,
  } = useQuery({
    queryKey: ['customer-tickets', id],
    queryFn: async () => {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid customer ID');
      }
      const { data, error } = await getCustomerTicketBalance(id);
      if (error) {
        throw new Error(error.message || 'Failed to fetch tickets');
      }
      return data;
    },
    enabled: !!id && typeof id === 'string',
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketTransactions } = useQuery({
    queryKey: ['customer-ticket-transactions', id],
    queryFn: async () => {
      if (!id || typeof id !== 'string') throw new Error('Invalid customer ID');
      const { data, error } = await getCustomerTicketTransactions(id);
      if (error) throw error;
      return data as TicketTransaction[];
    },
    enabled: !!id && typeof id === 'string',
    staleTime: 5 * 60 * 1000,
  });

  const { data: productSales } = useQuery({
    queryKey: ['customer-product-sales', id],
    queryFn: async () => {
      if (!id || typeof id !== 'string') throw new Error('Invalid customer ID');
      const { data, error } = await fetchProductSalesByCustomer(id);
      if (error) throw error;
      return data as AppointmentProductSaleRecord[];
    },
    enabled: !!id && typeof id === 'string',
    staleTime: 5 * 60 * 1000,
  });

  const historyItems = useMemo<HistoryItem[]>(
    () =>
      [
        ...appointments.map((appointment) => ({
          id: `a-${appointment.id}`,
          type: 'appointment' as const,
          date: new Date(`${appointment.appointment_date}T${appointment.start_time}`),
          data: appointment,
        })),
        ...(ticketTransactions || [])
          .filter((transaction) => transaction.transaction_type === 'granted')
          .map((transaction) => ({
            id: `t-${transaction.id}`,
            type: 'ticket' as const,
            date: new Date(transaction.created_at),
            data: transaction,
          })),
        ...(productSales || []).map((sale) => ({
          id: `s-${sale.id}`,
          type: 'sale' as const,
          date: new Date(sale.created_at),
          data: sale,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [appointments, productSales, ticketTransactions]
  );


  if (isLoadingCustomers || isLoadingAppointments || isLoadingTickets) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (customersError || appointmentsError || ticketsError || !member || isRestrictedMember) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-8">
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text className="text-center text-lg font-medium text-gray-900">
          שגיאה בטעינת פרטי הלקוח
        </Text>
        <Text className="text-center text-sm text-gray-500">
          {customersError && 'לא ניתן לטעון את פרטי הלקוח כרגע'}
          {appointmentsError && 'לא ניתן לטעון את תורי הלקוח כרגע'}
          {ticketsError && 'לא ניתן לטעון את כרטיסי הלקוח כרגע'}
          {(!member || isRestrictedMember) && 'לקוח לא נמצא'}
        </Text>
        <Pressable onPress={() => router.back()} className="rounded-lg bg-black px-6 py-3">
          <Text className="text-center font-medium text-white">חזור</Text>
        </Pressable>
      </View>
    );
  }

  const appointmentRevenue = (appointments || []).reduce(
    (sum, a) => sum + (a.appointment_type?.price || 0),
    0
  );
  const salesRevenue = (productSales || []).reduce(
    (sum, s) => sum + (s.total_price || s.unit_price * s.quantity || 0),
    0
  );
  const completedCount = (appointments || []).filter((a) => {
    const dt = new Date(`${a.appointment_date}T${a.start_time}`);
    return dt <= new Date();
  }).length;
  const totalRevenue = appointmentRevenue + salesRevenue;
  const appointmentCountLabel = hasNextPage ? `${appointments.length}+` : `${appointments.length}`;
  return (
    <MemberHistoryList
      historyItems={historyItems}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      header={
        <>
          <View className="gap-5 px-6 py-6">
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={canEditAvatar ? handleAvatarEdit : undefined}
                disabled={!canEditAvatar || isUploadingAvatar}
                className="relative">
                <View
                  className="h-16 w-16 overflow-hidden rounded-full bg-gray-100"
                  style={{ opacity: isUploadingAvatar ? 0.6 : 1 }}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ height: '100%', width: '100%' }}
                      contentFit="cover"
                      transition={300}
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-lg font-semibold text-gray-400">
                        {getInitials(member.full_name)}
                      </Text>
                    </View>
                  )}
                </View>
                {isUploadingAvatar && (
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-black/20">
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {canEditAvatar && !isUploadingAvatar && (
                  <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full bg-black">
                    <Ionicons name="camera" size={11} color="#fff" />
                  </View>
                )}
              </Pressable>

              <View className="flex-1 gap-1">
                <Pressable
                  onPress={() => {
                    if (!canEditRole) return;
                    Alert.prompt(
                      'עריכת שם',
                      'הזן שם חדש:',
                      [
                        { text: 'ביטול', style: 'cancel' },
                        {
                          text: 'שמור',
                          onPress: async (newName?: string) => {
                            if (newName && newName.trim() && newName.trim() !== member.full_name) {
                              try {
                                await updateProfile({ full_name: newName.trim() });
                                queryClient.invalidateQueries({ queryKey: ['customers'] });
                                toast.success('השם עודכן בהצלחה');
                              } catch {
                                toast.error('שגיאה בעדכון השם');
                              }
                            }
                          }
                        },
                      ],
                      'plain-text',
                      member.full_name
                    );
                  }}
                  className="flex-row items-center gap-1">
                  <Text className="text-left text-lg font-bold text-gray-900">
                    {member.full_name}
                  </Text>
                  {canEditRole && <Ionicons name="pencil" size={12} color="#9CA3AF" />}
                </Pressable>
                <Text className="text-left text-sm text-gray-500">{member.phone}</Text>
                <Text className="text-left text-xs text-gray-400">
                  הצטרף ב-{formatDate(member.created_at)}
                </Text>
              </View>

              <View className="flex-row gap-2">
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-green-50"
                  onPress={() => {
                    const wa = normalizePhoneForWhatsApp(member.phone);
                    if (wa) Linking.openURL(`https://wa.me/${wa}`);
                  }}>
                  <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
                </Pressable>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-blue-50"
                  onPress={() => {
                    const tel = normalizePhoneForCall(member.phone);
                    if (tel) Linking.openURL(`tel:${tel}`);
                  }}>
                  <Ionicons name="call" size={18} color="#3B82F6" />
                </Pressable>
              </View>
            </View>

            <View className="flex-row gap-px overflow-hidden rounded-lg bg-gray-100">
              <View className="flex-1 items-center bg-white py-3">
                <Text className="text-lg font-bold text-gray-900">{appointmentCountLabel}</Text>
                <Text className="text-xs text-gray-500">תורים</Text>
              </View>
              <View className="flex-1 items-center bg-white py-3">
                <Text className="text-lg font-bold text-gray-900">₪{totalRevenue}</Text>
                <Text className="text-xs text-gray-500">הכנסות</Text>
              </View>
              <View className="flex-1 items-center bg-white py-3">
                <Text className="text-lg font-bold text-gray-900">{completedCount}</Text>
                <Text className="text-xs text-gray-500">הושלמו</Text>
              </View>
              <View className="flex-1 items-center bg-white py-3">
                <Text className="text-lg font-bold text-purple-600">{ticketBalance || 0}</Text>
                <Text className="text-xs text-gray-500">כרטיסים</Text>
              </View>
            </View>
          </View>

          <View className="h-2 bg-gray-50" />

          <View>
            <View className="gap-2 px-6 py-4">
              <Text className="text-left text-sm font-medium text-gray-500">תפקיד</Text>
              {canEditRole ? (
                <View className="flex-row flex-wrap gap-2">
                  {roleOptions.map((option) => {
                    const isSelected = selectedRole === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => handleRoleSelect(option.value)}
                        disabled={!canEditRole || isUpdatingProfile}
                        className={`rounded-full px-4 py-2 ${
                          isSelected ? 'bg-gray-900' : 'bg-gray-100'
                        }`}>
                        <Text
                          className={`text-sm font-medium ${
                            isSelected ? 'text-white' : 'text-gray-600'
                          }`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View className="self-start rounded-full bg-gray-100 px-3 py-1.5">
                  <Text className="text-left text-sm font-medium text-gray-600">
                    {roleOptions.find((option) => option.value === member.role)?.label || 'לקוח'}
                  </Text>
                </View>
              )}
            </View>

            <View className="px-6">
              <View className="h-px bg-gray-100" />
            </View>

            {canEditOrder && (
              <>
                <View className="gap-2 px-6 py-4">
                  <Text className="text-left text-sm font-medium text-gray-500">סדר הצגה</Text>
                  <Text className="text-left text-xs text-gray-400">
                    ערך נמוך יוצג ראשון ברשימות אנשי הצוות.
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      value={displayOrderInput}
                      onChangeText={setDisplayOrderInput}
                      placeholder="לדוגמה 1"
                      keyboardType="numeric"
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-left"
                    />
                    <Button
                      title={isUpdatingProfile ? 'שומר...' : 'שמור'}
                      onPress={handleOrderSave}
                      size="sm"
                      disabled={!canEditOrder || !hasOrderChange || isUpdatingProfile}
                    />
                  </View>
                </View>
                <View className="px-6">
                  <View className="h-px bg-gray-100" />
                </View>
              </>
            )}

            {canEditBlock && (
              <>
                <View className="flex-row items-center justify-between px-6 py-4">
                  <View className="flex-1 gap-1">
                    <Text className="text-left text-sm font-medium text-gray-500">
                      חסימת משתמש
                    </Text>
                    <Text className="text-left text-xs text-gray-400">
                      {isBlocked
                        ? 'המשתמש לא יוכל להשתמש באפליקציה.'
                        : 'המשתמש פעיל ויכול להשתמש באפליקציה.'}
                    </Text>
                  </View>
                  <Switch
                    value={isBlocked}
                    onValueChange={handleBlockedToggle}
                    disabled={!canEditBlock || isUpdatingProfile}
                  />
                </View>
                <View className="px-6">
                  <View className="h-px bg-gray-100" />
                </View>
              </>
            )}

            {canManageTickets && (
              <View className="flex-row items-center justify-between px-6 py-4">
                <View className="gap-1">
                  <Text className="text-left text-sm font-medium text-gray-500">כרטיסים</Text>
                  <Text className="text-left text-base font-semibold text-gray-900">
                    {ticketBalance || 0} כרטיסים
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(crew)/(tabs)/members/add-tickets',
                      params: { id },
                    })
                  }
                  className="rounded-lg bg-black px-4 py-2">
                  <Text className="text-sm font-medium text-white">ניהול</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="h-2 bg-gray-50" />

            <View className="gap-3 px-6 py-4">
              <Text className="text-left text-sm font-medium text-gray-500">היסטוריה</Text>
            </View>
        </>
      }
    />
  );
}

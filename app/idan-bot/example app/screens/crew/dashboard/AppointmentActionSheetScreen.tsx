import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import SheetActionButton from '@/components/ui/SheetActionButton';
import SheetLayout from '@/components/ui/SheetLayout';
import { useAuth } from '@/contexts/AuthContext';
import { cancelAppointment, cancelAppointmentPermanent } from '@/services/crew/appointments';
import { getCustomerTicketBalanceForCrew } from '@/services/crew/tickets';
import { normalizePhoneForCall, normalizePhoneForWhatsApp } from '@/utils/formatPhoneNumber';
import { toast } from 'sonner-native';

const AppointmentActionSheetScreen = () => {
  const {
    'appointment-id': appointmentIdParam,
    appointmentTypeName: appointmentTypeNameParam,
    customerName: customerNameParam,
    customerPhone: customerPhoneParam,
    customerId: customerIdParam,
    appointmentDate: appointmentDateParam,
    startTime: startTimeParam,
    endTime: endTimeParam,
    appointmentStatus: appointmentStatusParam,
    cancellationReason: cancellationReasonParam,
  } = useLocalSearchParams<{
    'appointment-id'?: string | string[];
    appointmentTypeName?: string | string[];
    customerName?: string | string[];
    customerPhone?: string | string[];
    customerId?: string | string[];
    appointmentDate?: string | string[];
    startTime?: string | string[];
    endTime?: string | string[];
    appointmentStatus?: string | string[];
    cancellationReason?: string | string[];
  }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const appointmentId = Array.isArray(appointmentIdParam)
    ? appointmentIdParam[0]
    : appointmentIdParam;
  const appointmentTypeName = Array.isArray(appointmentTypeNameParam)
    ? appointmentTypeNameParam[0]
    : appointmentTypeNameParam;
  const customerName = Array.isArray(customerNameParam) ? customerNameParam[0] : customerNameParam;
  const customerPhone = Array.isArray(customerPhoneParam)
    ? customerPhoneParam[0]
    : customerPhoneParam;
  const customerId = Array.isArray(customerIdParam) ? customerIdParam[0] : customerIdParam;
  const appointmentDate = Array.isArray(appointmentDateParam)
    ? appointmentDateParam[0]
    : appointmentDateParam;
  const startTime = Array.isArray(startTimeParam) ? startTimeParam[0] : startTimeParam;
  const endTime = Array.isArray(endTimeParam) ? endTimeParam[0] : endTimeParam;
  const appointmentStatus = Array.isArray(appointmentStatusParam)
    ? appointmentStatusParam[0]
    : appointmentStatusParam;
  const cancellationReason = Array.isArray(cancellationReasonParam)
    ? cancellationReasonParam[0]
    : cancellationReasonParam;

  const { data: ticketBalance } = useQuery({
    queryKey: ['customer-tickets', customerId, user?.id],
    queryFn: async () => {
      const { data } = await getCustomerTicketBalanceForCrew(customerId!, user!.id);
      return data ?? 0;
    },
    enabled: !!customerId && !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      reason,
      permanent,
    }: {
      appointmentId: string;
      reason: string;
      permanent?: boolean;
    }) => {
      if (permanent) {
        return cancelAppointmentPermanent(appointmentId, reason);
      }
      return cancelAppointment(appointmentId, reason);
    },
    onSuccess: (result, variables) => {
      if (variables.permanent) {
        queryClient.setQueriesData(
          { queryKey: ['schedule-range'], exact: false },
          (oldData: any) => {
            if (!oldData?.data || !Array.isArray(oldData.data)) return oldData;
            return {
              ...oldData,
              data: oldData.data.map((item: any) =>
                item?.type === 'appointment' && item?.data?.id === appointmentId
                  ? {
                      ...item,
                      data: {
                        ...item.data,
                        status: 'cancelled',
                        cancellation_reason: variables.reason,
                      },
                    }
                  : item
              ),
            };
          }
        );
      } else {
        queryClient.setQueriesData(
          { queryKey: ['schedule-range'], exact: false },
          (oldData: any) => {
            if (!oldData?.data || !Array.isArray(oldData.data)) return oldData;
            return {
              ...oldData,
              data: oldData.data.filter(
                (item: any) => !(item?.type === 'appointment' && item?.data?.id === appointmentId)
              ),
            };
          }
        );
      }

      const crewMemberId = result?.data?.crew_member_id;
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-range'], exact: false });
      if (crewMemberId) {
        queryClient.invalidateQueries({ queryKey: ['appointments', crewMemberId] });
        queryClient.invalidateQueries({ queryKey: ['schedule-range', crewMemberId], exact: false });
      }
      toast.success(
        variables.permanent ? 'התור בוטל לצמיתות' : 'התור בוטל בהצלחה והלקוח קיבל הודעה'
      );
      router.back();
    },
    onError: (error: any) => {
      console.error('Error cancelling appointment:', error);
      toast.error('שגיאה בביטול התור');
    },
  });

  const handlePhoneCall = async (customerPhoneValue?: string) => {
    try {
      if (!customerPhoneValue) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }
      const normalized = normalizePhoneForCall(customerPhoneValue);
      if (!normalized) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }
      await Linking.openURL(`tel:${normalized}`);
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      toast.error('לא ניתן לבצע שיחה');
    }
  };

  const handleWhatsApp = async (customerPhoneValue?: string) => {
    try {
      if (!customerPhoneValue) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }

      const normalized = normalizePhoneForWhatsApp(customerPhoneValue);
      if (!normalized) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }
      const whatsappUrl = `https://wa.me/${normalized}`;
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error('לא ניתן לפתוח את וואטסאפ');
    }
  };

  const handleCancelAppointment = (appointmentIdValue: string, customerNameValue?: string) => {
    Alert.alert('ביטול תור', `איך לבטל את התור של ${customerNameValue || ''}?`, [
      { text: 'חזור', style: 'cancel' },
      {
        text: 'ביטול רגיל',
        onPress: () => promptCancelReason(appointmentIdValue, false),
      },
      {
        text: 'ביטול לצמיתות',
        style: 'destructive',
        onPress: () => promptCancelReason(appointmentIdValue, true),
      },
    ]);
  };

  const promptCancelReason = (appointmentIdValue: string, permanent?: boolean) => {
    Alert.prompt(
      permanent ? 'ביטול לצמיתות' : 'ביטול תור',
      permanent
        ? 'השעה לא תהיה פתוחה יותר להזמנה.\n\nאנא ציין סיבה לביטול:'
        : 'אנא ציין סיבה לביטול:',
      [
        { text: 'חזור', style: 'cancel' },
        {
          text: permanent ? 'בטל לצמיתות' : 'בטל תור',
          style: 'destructive',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              cancelMutation.mutate({
                appointmentId: appointmentIdValue,
                reason: reason.trim(),
                permanent,
              });
            } else {
              toast.error('חובה להזין סיבה לביטול');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleSellProducts = (appointmentIdValue: string, customerNameValue?: string) => {
    try {
      router.push({
        pathname: '/(crew)/sell-products',
        params: {
          appointmentId: appointmentIdValue,
          customerName: customerNameValue || 'לקוח',
        },
      });
    } catch (error) {
      console.error('Error navigating to sell products:', error);
      Alert.alert('שגיאה', 'לא ניתן לנווט למסך מכירת מוצרים');
    }
  };

  if (!appointmentId) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-slate-600">לא נמצא מזהה תור</Text>
      </View>
    );
  }

  const isCrewOrAdmin = user?.role === 'crew' || user?.role === 'admin';
  const isCancelled = appointmentStatus === 'cancelled';
  const isCancelling = cancelMutation.isPending;

  const badgeLabel = `${startTime || '--:--'} - ${endTime || '--:--'}`;

  if (isCancelled) {
    return (
      <SheetLayout
        title={customerName || 'לקוח'}
        subtitle={appointmentTypeName || 'תור'}
        badgeLabel={badgeLabel}
        containerStyle={{ direction: 'rtl' }}>
        <View className="mt-4 items-center gap-3 rounded-xl bg-red-50 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-red-700">התור בוטל לצמיתות</Text>
          </View>
          {!!cancellationReason && (
            <View className="w-full rounded-lg bg-white px-4 py-3">
              <Text className="mb-1 text-left text-xs font-medium text-slate-500">סיבת ביטול:</Text>
              <Text className="text-center text-sm leading-5 text-slate-800">
                {cancellationReason}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 gap-3">
          <SheetActionButton
            label="שיחה טלפונית"
            variant="primary"
            onPress={() => handlePhoneCall(customerPhone)}
            icon={<FontAwesome6 name="phone" size={14} color="#fff" />}
          />

          <SheetActionButton
            label="שלח וואטסאפ"
            variant="primary"
            onPress={() => handleWhatsApp(customerPhone)}
            icon={<FontAwesome6 name="whatsapp" size={16} color="#fff" />}
          />
        </View>
      </SheetLayout>
    );
  }

  return (
    <SheetLayout
      title={customerName || 'לקוח'}
      subtitle={appointmentTypeName || 'תור'}
      badgeLabel={badgeLabel}
      containerStyle={{ direction: 'rtl' }}>
      {!!ticketBalance && ticketBalance > 0 && (
        <View className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-purple-50 px-4 py-3">
          <FontAwesome6 name="ticket" size={14} color="#9333EA" />
          <Text className="text-sm font-semibold text-purple-700">{ticketBalance} כרטיסיות</Text>
        </View>
      )}

      <View className="mt-4 gap-3">
        <SheetActionButton
          label="שיחה טלפונית"
          variant="primary"
          onPress={() => handlePhoneCall(customerPhone)}
          icon={<FontAwesome6 name="phone" size={14} color="#fff" />}
        />

        <SheetActionButton
          label="שלח וואטסאפ"
          variant="primary"
          onPress={() => handleWhatsApp(customerPhone)}
          icon={<FontAwesome6 name="whatsapp" size={16} color="#fff" />}
        />

        {isCrewOrAdmin && (
          <SheetActionButton
            label="מכירת מוצר"
            variant="primary"
            onPress={() => handleSellProducts(appointmentId, customerName || 'לקוח')}
            icon={<FontAwesome6 name="cart-shopping" size={14} color="#fff" />}
          />
        )}

        <SheetActionButton
          label="בטל תור"
          loadingLabel="מבטל..."
          variant="primary"
          isLoading={isCancelling}
          onPress={() => handleCancelAppointment(appointmentId, customerName)}
          icon={<FontAwesome6 name="xmark" size={14} color="#fff" />}
        />
      </View>
    </SheetLayout>
  );
};

export default AppointmentActionSheetScreen;

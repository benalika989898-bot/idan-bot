import { View, Text, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import React, { memo, useState } from 'react';
import { Image } from 'expo-image';
import { Appointment } from '@/types/appointments';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelAppointment } from '@/services/crew/appointments';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneForWhatsApp } from '@/utils/formatPhoneNumber';
import { router } from 'expo-router';

const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      cancelAppointment(appointmentId, reason),
    onSuccess: () => {
      // Invalidate and refetch appointments
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('התור בוטל בהצלחה והלקוח קיבל הודעה');
    },
    onError: (error: any) => {
      console.error('Error cancelling appointment:', error);
      toast.error('שגיאה בביטול התור');
    },
    onSettled: () => {
      setCancelling(false);
    },
  });

  const handleWhatsApp = async () => {
    try {
      const customerPhone = appointment.customer?.phone;
      if (!customerPhone) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }

      const normalized = normalizePhoneForWhatsApp(customerPhone);
      if (!normalized) {
        toast.error('לא נמצא מספר טלפון ללקוח');
        return;
      }
      const whatsappUrl = `https://wa.me/${normalized}`;

      // Open WhatsApp
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error('לא ניתן לפתוח את וואטסאפ');
    }
  };

  const handleCancelAppointment = () => {
    Alert.prompt(
      'ביטול תור',
      `האם אתה בטוח שברצונך לבטל את התור של ${appointment.customer?.full_name}?\n\nאנא ציין סיבה לביטול:`,
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'בטל תור',
          style: 'destructive',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              setCancelling(true);
              cancelMutation.mutate({
                appointmentId: appointment.id,
                reason: reason.trim(),
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

  const handleSellProducts = () => {
    console.log('Sell products button clicked', {
      appointmentId: appointment.id,
      customerName: appointment.customer?.full_name,
    });

    try {
      router.push({
        pathname: '/(crew)/sell-products',
        params: {
          appointmentId: appointment.id,
          customerName: appointment.customer?.full_name || 'לקוח',
        },
      });
    } catch (error) {
      console.error('Error navigating to sell products:', error);
      Alert.alert('שגיאה', 'לא ניתן לנווט למסך מכירת מוצרים');
    }
  };

  const isCrewOrAdmin = user?.role === 'crew' || user?.role === 'admin';

  return (
    <View style={{ direction: 'rtl' }} className="mb-1 rounded-md border border-gray-100 bg-white">
      <View className="px-3 py-1.5">
        <View className="flex-row items-center gap-2">
          <View className="relative">
            <Image
              source={{
                uri: appointment.customer?.avatar_url || 'https://via.placeholder.com/40',
              }}
              style={{ height: 32, width: 32, borderRadius: 16 }}
              contentFit="cover"
              className="bg-gray-100"
            />
          </View>

          <View className="flex-1">
            <Text className="text-left text-sm font-semibold text-gray-900" numberOfLines={1}>
              {appointment.customer?.full_name}
            </Text>
            <Text className="text-left text-xs text-gray-500">
              {appointment.appointment_type?.name}
            </Text>
          </View>

          <View className="rounded-md bg-indigo-50 px-2 py-0.5">
            <Text className="text-xs font-semibold text-indigo-700">
              {appointment.start_time?.slice(0, 5)}
            </Text>
          </View>
        </View>

        <View className="mt-1.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <FontAwesome6 name="clock" size={10} color="#6B7280" />
            <Text className=" text-xs text-gray-500">
              {appointment.appointment_type?.duration_minutes} דקות
            </Text>
          </View>

          {appointment.appointment_type?.price && (
            <View className="flex-row items-center">
              <FontAwesome6 name="shekel-sign" size={10} color="#6B7280" />
              <Text className="mr-1 text-xs text-gray-500">
                {appointment.appointment_type.price}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row border-t border-gray-50">
        <Pressable
          onPress={handleWhatsApp}
          className="flex-1 flex-row items-center justify-center bg-emerald-50 py-1.5 active:bg-emerald-100"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#d1fae5' : '#ecfdf3',
          })}>
          <Text className="mr-1 text-xs font-semibold text-emerald-700">וואטסאפ</Text>
          <FontAwesome6 name="whatsapp" size={14} color="#047857" />
        </Pressable>

        {isCrewOrAdmin && (
          <>
            <View className="w-px bg-gray-100" />
            <Pressable
              onPress={handleSellProducts}
              className="flex-1 flex-row items-center justify-center bg-slate-50 py-1.5 active:bg-slate-100"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#e2e8f0' : '#f8fafc',
              })}>
              <Text className="mr-1 text-xs font-semibold text-slate-600">מכירת מוצר</Text>
              <FontAwesome6 name="cart-shopping" size={12} color="#475569" />
            </Pressable>
          </>
        )}

        <View className="w-px bg-gray-100" />

        <Pressable
          onPress={handleCancelAppointment}
          disabled={cancelling}
          className={`flex-1 flex-row items-center justify-center py-1.5 ${
            cancelling ? 'bg-gray-50' : 'bg-rose-50 active:bg-rose-100'
          }`}
          style={({ pressed }) => ({
            backgroundColor: cancelling ? '#f9fafb' : pressed ? '#ffe4e6' : '#fff1f2',
          })}>
          {cancelling ? (
            <>
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text className="mr-1 text-xs font-semibold text-gray-400">מבטל...</Text>
            </>
          ) : (
            <>
              <Text className="mr-1 text-xs font-semibold text-rose-600">בטל תור</Text>
              <FontAwesome6 name="xmark" size={12} color="#ef4444" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default memo(AppointmentCard);

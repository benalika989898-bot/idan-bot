import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useState } from 'react';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { recordAppointmentProductSales } from '@/services/crew/appointmentSales';
import { decrementProductStock } from '@/services/crew/products';
import { router } from 'expo-router';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  in_stock: boolean;
  stock_quantity?: number | null;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number; // Allow custom pricing
}

const ProductsSummary = ({
  cart,
  customerName,
  appointmentId,
  showConfirmation,
  onBack,
  onUpdateItemPrice,
}: {
  cart: CartItem[];
  customerName: string;
  appointmentId: string;
  showConfirmation: boolean;
  onBack: () => void;
  onUpdateItemPrice: (productId: string, newPrice: number) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const recordSalesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !appointmentId) {
        throw new Error('Missing required data');
      }

      const salesData = cart.map((item) => ({
        appointment_id: appointmentId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.customPrice || item.product.price,
        sold_by: user.id,
        notes: notes || undefined,
      }));

      const { data, error } = await recordAppointmentProductSales(salesData);
      if (error) throw error;
      const stockResult = await decrementProductStock(
        cart.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
      );
      return { data, stockResult };
    },
    onSuccess: (result) => {
      if (result.stockResult?.error) {
        toast.error('המכירות נרשמו, אך עדכון המלאי נכשל');
      } else {
        toast.success('המכירות נרשמו בהצלחה');
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-sales', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה ברישום המכירות');
    },
  });

  const totalAmount = cart.reduce(
    (sum, item) => sum + (item.customPrice || item.product.price) * item.quantity,
    0
  );
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirmSale = () => {
    Alert.alert(
      'אישור מכירה',
      `האם אתה בטוח שברצונך לרשום מכירה של ${totalItems} פריטים בסכום של ₪${totalAmount}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'אשר', onPress: () => recordSalesMutation.mutate() },
      ]
    );
  };

  if (cart.length === 0) return null;

  // For confirmation mode, wrap with KeyboardAvoidingView
  if (showConfirmation) {
    return (
      <KeyboardAvoidingView
        behavior={'padding'}
        keyboardVerticalOffset={100}
        className="flex-1"
        style={{ direction: 'rtl' }}>
        <Animated.View
          style={{
            height: '100%',
            paddingBottom: insets.bottom,
          }}
          entering={FadeInDown.delay(300)}
          layout={LinearTransition}
          className="w-full justify-between rounded-2xl bg-neutral-100 p-6">
          <Animated.View layout={LinearTransition} className="gap-6">
            <View>
              <Text className="text-center text-4xl text-neutral-800">אישור מכירה</Text>
              <Text className="mt-2 text-center text-lg text-neutral-600">
                ללקוח: {customerName}
              </Text>
            </View>

            {/* Full confirmation view */}
            <Animated.View className="items-center">
              <Text className="mb-4 text-center text-xl font-medium text-neutral-800">
                פריטים שנמכרו:
              </Text>
              <ScrollView className="max-h-80 w-full" showsVerticalScrollIndicator={false}>
                {cart.map((item) => {
                  const currentPrice = item.customPrice || item.product.price;
                  const isDiscounted = item.customPrice && item.customPrice < item.product.price;

                  return (
                    <View key={item.product.id} className="mb-3 rounded-lg bg-white p-4">
                      <View className="flex-row items-center gap-4">
                        {item.product.image_url && (
                          <Image
                            source={{ uri: item.product.image_url }}
                            style={{ height: 50, width: 50, borderRadius: 8 }}
                            contentFit="contain"
                            className="ml-3 bg-gray-100"
                            transition={300}
                          />
                        )}
                        <View className="flex-1 gap-2">
                          <Text className="text-left font-medium text-neutral-800">
                            {item.product.name}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-left text-sm text-neutral-500">
                              {item.quantity} x
                            </Text>
                            <TextInput
                              value={currentPrice.toString()}
                              onChangeText={(text) => {
                                const newPrice = parseFloat(text) || 0;
                                onUpdateItemPrice(item.product.id, newPrice);
                              }}
                              keyboardType="numeric"
                              className="min-w-[60px] rounded border border-gray-200 bg-gray-50 px-2 py-1 text-center "
                              style={{ textAlign: 'center' }}
                            />
                            <Text className="text-left text-sm text-neutral-500">₪</Text>
                          </View>
                          {isDiscounted && (
                            <Text className="text-left text-xs text-red-500">
                              מחיר מקורי: ₪{item.product.price}
                            </Text>
                          )}
                        </View>
                        <Text className="font-bold text-neutral-800">
                          ₪{item.quantity * currentPrice}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* Total Section - Full view only */}
            {showConfirmation && (
              <Animated.View entering={FadeIn} className="rounded-xl bg-white p-4">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-center text-lg text-neutral-500">סה"כ פריטים</Text>
                    <Text className="text-center text-xl font-semibold text-neutral-800">
                      {totalItems}
                    </Text>
                  </View>
                  <View className="h-8 w-px bg-neutral-300" />
                  <View className="flex-1">
                    <Text className="text-center text-lg text-neutral-500">סה"כ לתשלום</Text>
                    <Text className="text-center text-2xl font-bold text-neutral-800">
                      ₪{totalAmount}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Notes Section - Full view only */}
            {showConfirmation && (
              <Animated.View entering={FadeIn}>
                <Text className="mb-2 text-right font-medium text-neutral-800">
                  הערות (אופציונלי):
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="הוסף הערות למכירה..."
                  multiline
                  numberOfLines={3}
                  className="rounded-lg border border-neutral-200 bg-white p-3"
                  style={{ textAlign: 'right', direction: 'rtl', textAlignVertical: 'top' }}
                />
              </Animated.View>
            )}
          </Animated.View>

          {/* Action Buttons */}
          {showConfirmation && (
            <Animated.View entering={FadeInDown} className="gap-3">
              <Pressable
                onPress={handleConfirmSale}
                disabled={recordSalesMutation.isPending}
                className={`rounded-lg py-4 ${
                  recordSalesMutation.isPending ? 'bg-gray-300' : 'bg-black'
                }`}>
                {recordSalesMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-medium text-white">אשר ורשום מכירה</Text>
                )}
              </Pressable>

              <Pressable onPress={onBack} className="items-center py-4">
                <Text className="text-lg text-neutral-600">חזרה</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // For compact mode, use regular view
  return (
    <Animated.View
      entering={FadeInDown.delay(300)}
      layout={LinearTransition}
      className="w-full justify-between rounded-2xl bg-neutral-100 p-6">
      <Animated.View layout={LinearTransition} className="gap-6">
        {/* Cart Summary */}
        <Animated.View className="flex-row items-center justify-between">
          {/* Compact view */}
          <View className="flex-1">
            <Text className="text-left text-lg font-semibold text-neutral-800">
              {totalItems} פריטים בעגלה
            </Text>
            <Text className="text-left text-sm text-neutral-500">סה"כ: ₪{totalAmount}</Text>
          </View>
          <Ionicons name="basket" size={24} color="#737373" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

export default ProductsSummary;

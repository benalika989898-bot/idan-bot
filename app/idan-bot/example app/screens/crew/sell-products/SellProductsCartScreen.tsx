import { useAuth } from '@/contexts/AuthContext';
import { recordAppointmentProductSales } from '@/services/crew/appointmentSales';
import { decrementProductStock } from '@/services/crew/products';
import { AppEmptyState } from '@/shared/ui/base/empty-state';
import Stepper from '@/shared/ui/molecules/stepper';
import { useSellProductsStore } from '@/stores/sellProductsStore';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function SellProductsCartScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cart = useSellProductsStore((s) => s.cart);
  const notes = useSellProductsStore((s) => s.notes);
  const appointmentId = useSellProductsStore((s) => s.appointmentId);
  const updateQuantity = useSellProductsStore((s) => s.updateQuantity);
  const updateItemPrice = useSellProductsStore((s) => s.updateItemPrice);
  const setNotes = useSellProductsStore((s) => s.setNotes);
  const totalItems = useSellProductsStore((s) => s.totalItems);
  const totalAmount = useSellProductsStore((s) => s.totalAmount);

  const itemCount = totalItems();
  const total = totalAmount();

  const recordSalesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !appointmentId) {
        throw new Error('Missing required data');
      }

      const salesData = cart.map((item) => ({
        appointment_id: appointmentId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.customPrice ?? item.product.price,
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
      router.dismiss();
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה ברישום המכירות');
    },
  });

  const handleConfirmSale = () => {
    Alert.alert(
      'אישור מכירה',
      `האם אתה בטוח שברצונך לרשום מכירה של ${itemCount} פריטים בסכום של ₪${total.toFixed(2)}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'אשר', onPress: () => recordSalesMutation.mutate() },
      ]
    );
  };

  if (cart.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppEmptyState
          title="העגלה ריקה"
          description="הוסף מוצרים מהקטלוג"
          icon={<Ionicons name="basket-outline" size={34} color="#737373" />}
          actionLabel="חזרה למוצרים"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        style={{ flex: 1, direction: 'rtl' }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Cart Items */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#171717',
              marginBottom: 12,
              textAlign: 'left',
            }}>
            פריטים בעגלה ({itemCount})
          </Text>

          {cart.map((item) => {
            const currentPrice = item.customPrice ?? item.product.price;
            const isDiscounted = item.customPrice != null && item.customPrice < item.product.price;

            return (
              <Animated.View
                key={item.product.id}
                layout={LinearTransition.duration(300)}
                exiting={FadeOut.duration(200)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ position: 'relative' }}>
                    {item.product.image_url ? (
                      <Image
                        source={{ uri: item.product.image_url }}
                        style={{
                          height: 64,
                          width: 64,
                          borderRadius: 12,
                          backgroundColor: '#f5f5f5',
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          height: 64,
                          width: 64,
                          borderRadius: 12,
                          backgroundColor: '#f5f5f5',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="cube-outline" size={24} color="#d4d4d4" />
                      </View>
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: -6,
                        backgroundColor: '#171717',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 5,
                        borderWidth: 2,
                        borderColor: '#fff',
                      }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        {item.quantity}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: '#171717',
                        textAlign: 'left',
                        marginBottom: 6,
                      }}>
                      {item.product.name}
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      {/* Price Input */}
                      <View style={{ alignItems: 'flex-start', gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 13, color: '#a3a3a3' }}>₪</Text>
                          <TextInput
                            value={currentPrice.toString()}
                            onChangeText={(text) => {
                              const newPrice = parseFloat(text) || 0;
                              updateItemPrice(item.product.id, newPrice);
                            }}
                            keyboardType="numeric"
                            style={{
                              minWidth: 56,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#e5e5e5',
                              backgroundColor: '#fafafa',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              textAlign: 'center',
                              fontSize: 14,
                              color: '#171717',
                            }}
                          />
                        </View>
                        {isDiscounted && (
                          <Text style={{ fontSize: 11, color: '#ef4444' }}>
                            מקורי: ₪{item.product.price}
                          </Text>
                        )}
                      </View>

                      {/* Stepper */}
                      <Stepper
                        value={item.quantity}
                        onValueChange={(val) => updateQuantity(item.product.id, val)}
                        min={0}
                        max={99}
                        size={32}
                      />
                    </View>

                    {/* Subtotal */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: '#f5f5f5',
                      }}>
                      <Text style={{ fontSize: 13, color: '#a3a3a3' }}>סכום חלקי:</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>
                        ₪{(item.quantity * currentPrice).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Order Summary */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 16,
              marginTop: 4,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#171717',
                textAlign: 'center',
                marginBottom: 12,
              }}>
              סיכום הזמנה
            </Text>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#737373' }}>סה״כ פריטים:</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717' }}>{itemCount}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>סכום כולל:</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }}>
                ₪{total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Notes */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#171717',
              marginBottom: 8,
              textAlign: 'left',
            }}>
            הערות (אופציונלי)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="הוסף הערות למכירה..."
            placeholderTextColor="#a3a3a3"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e5e5e5',
              padding: 14,
              fontSize: 14,
              color: '#171717',
              textAlign: 'right',
              textAlignVertical: 'top',
              minHeight: 80,
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Confirm Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          paddingHorizontal: 16,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        }}>
        <Pressable
          onPress={handleConfirmSale}
          disabled={recordSalesMutation.isPending}
          style={{
            backgroundColor: recordSalesMutation.isPending ? '#a3a3a3' : '#171717',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {recordSalesMutation.isPending ? 'שומר...' : `אשר מכירה - ₪${total.toFixed(2)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

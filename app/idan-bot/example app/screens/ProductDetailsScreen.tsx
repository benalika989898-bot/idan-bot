import { getProduct } from '@/services/crew/products';
import { Product } from '@/types/products';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const {
    data: product,
    isLoading,
    error,
  } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const result = await getProduct(id!);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, direction: 'ltr' }} className="items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, direction: 'ltr' }} className="items-center justify-center bg-white">
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="mt-4 text-center text-gray-500">שגיאה בטעינת המוצר</Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-full bg-black px-6 py-3">
          <Text className="font-medium text-white">חזור</Text>
        </Pressable>
      </View>
    );
  }

  const imageHeight = screenWidth * 1.1;

  return (
    <View style={{ flex: 1, direction: 'ltr' }} className="bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={true}>
        {/* Hero Image */}
        <View style={{ width: screenWidth, height: imageHeight, backgroundColor: '#f3f4f6' }}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image-outline" size={80} color="#d1d5db" />
            </View>
          )}
          {/* Bottom gradient for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            locations={[0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: imageHeight * 1 }}
          />
          {/* Product name + price overlay */}
          <View
            style={{ position: 'absolute', bottom: 24, left: 0, right: 0, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'right' }}>
              {product.name}
            </Text>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: 'white',
                textAlign: 'right',
                marginTop: 4,
              }}>
              ₪{product.price}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
            gap: 20,
          }}>
          {/* Stock badge + category */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: product.in_stock ? '#dcfce7' : '#fee2e2',
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: product.in_stock ? '#166534' : '#991b1b',
                }}>
                {product.in_stock ? 'במלאי' : 'לא במלאי'}
              </Text>
            </View>
            {product.category && (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 100,
                  backgroundColor: '#f3f4f6',
                }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
                  {product.category}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View>
              <Text style={{ fontSize: 15, lineHeight: 24, color: '#4b5563', textAlign: 'right' }}>
                {product.description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating close button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top / 3,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="close" size={20} color="white" />
      </Pressable>
    </View>
  );
}

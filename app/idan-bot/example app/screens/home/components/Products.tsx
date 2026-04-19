import { useAuth } from '@/contexts/AuthContext';
import { getProducts as fetchProducts } from '@/services/crew/products';
import { Product } from '@/types/products';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Skeleton } from 'moti/skeleton';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const CARD_WIDTH = 192;
const CARD_HEIGHT = 240;
function ProductsSkeleton() {
  return (
    <Skeleton.Group show>
      <View style={{ direction: 'ltr' }}>
        <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Skeleton colorMode="light" width={160} height={24} radius={8} />
          <Skeleton colorMode="light" width={240} height={18} radius={6} />
        </View>
        <ScrollableSkeletonCards />
      </View>
    </Skeleton.Group>
  );
}

function ScrollableSkeletonCards() {
  return (
    <FlatList
      data={[0, 1, 2]}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
      renderItem={() => (
        <View style={{ marginHorizontal: 8 }}>
          <Skeleton colorMode="light" width={CARD_WIDTH} height={CARD_HEIGHT} radius={12} />
        </View>
      )}
      keyExtractor={(item) => String(item)}
    />
  );
}

const Products = () => {
  const { user } = useAuth();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const result = await fetchProducts();
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.in_stock && (product.stock_quantity == null || product.stock_quantity > 0)
      ),
    [products]
  );

  const renderProductCard = useCallback(
    ({ item }: { item: Product }) => (
      <Pressable
        onPress={() => {
          if (user?.role === 'crew' || user?.role === 'admin') {
            router.push(`/(crew)/products/${item.id}`);
          } else {
            router.push(`/product-details?id=${item.id}`);
          }
        }}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          marginHorizontal: 8,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#e5e7eb',
        }}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: '100%', height: '100%' }}
            transition={300}
            contentFit="fill"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={28} color="#9CA3AF" />
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
          locations={[0.4, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
          <Text className="mb-1 text-center text-sm font-bold text-white" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-center text-sm font-semibold text-white">₪{item.price}</Text>
        </View>
      </Pressable>
    ),
    [user?.role]
  );

  if (isLoading) return <ProductsSkeleton />;
  if (!availableProducts.length) return null;

  return (
    <Animated.View entering={FadeIn.duration(1000)}>
      {/* Section Header */}
      <View>
        <Text className="text-center text-xl font-semibold">המוצרים שלנו</Text>
        <Text className="font-neutral-500 text-center text-base font-light">
          גללו כדי לראות את המוצרים הזמינים
        </Text>
      </View>
      {/* Horizontal Products List */}
      <FlatList
        data={availableProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        getItemLayout={(_, index) => ({ length: 208, offset: 208 * index, index })}
      />
    </Animated.View>
  );
};

export default Products;

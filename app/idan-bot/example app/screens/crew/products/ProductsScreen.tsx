import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types/products';
import { getAndroidTopInset } from '@/utils/androidInsets';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProducts as fetchProducts } from '@/services/crew/products';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Vary aspect ratios for a subtle masonry feel
const ASPECT_RATIOS = [1.15, 1.4, 1.2, 1.05, 1.35];

function ProductCard({ item, aspectRatio }: { item: Product; aspectRatio: number }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => router.push(`/(crew)/products/${item.id}`)}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 240 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 240 });
      }}
      style={[
        animatedStyle,
        {
          borderRadius: 22,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        },
      ]}>
      {/* Image */}
      <View
        style={{
          width: '100%',
          aspectRatio,
          backgroundColor: '#F3F4F6',
        }}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between gap-2 px-3 py-3">
        <View className="flex-1">
          <Text className="text-left text-sm text-gray-700" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-left text-base font-bold text-gray-900">₪{item.price}</Text>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            backgroundColor: '#111111',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons
            name="arrow-forward"
            size={15}
            color="#FFFFFF"
            style={{ transform: [{ rotate: '-45deg' }] }}
          />
        </View>
      </View>
    </AnimatedPressable>
  );
}

function AddProductsTile() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => router.navigate('/products/add')}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 240 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 240 });
      }}
      style={animatedStyle}>
      <LinearGradient
        colors={['#E5F7C2', '#B6E8B1']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          borderRadius: 22,
          paddingVertical: 22,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: '#111111',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </View>
        <Text className="text-base font-semibold text-gray-900">הוסף מוצר</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const result = await fetchProducts();
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: user?.role === 'crew' || user?.role === 'admin',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    setRefreshing(false);
  };

  // Only show to crew members with owner permissions
  if (user?.role !== 'crew' && user?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
        <Text className="mt-4 text-center text-lg text-gray-500">אין לך הרשאה לצפות בדף זה</Text>
      </View>
    );
  }

  // Split products into two columns for masonry layout.
  // Column A (source[0]) renders on the visual right under RTL.
  const columnA: Product[] = [];
  const columnB: Product[] = [];
  products.forEach((p, i) => {
    (i % 2 === 0 ? columnA : columnB).push(p);
  });

  const renderEmptyState = () => (
    <View className="items-center justify-center px-8 py-12">
      <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
      <Text className="mb-2 mt-4 text-center text-lg font-medium text-gray-500">
        אין מוצרים עדיין
      </Text>
      <Text className="mb-6 text-center text-gray-400">הוסף את המוצר הראשון שלך כדי להתחיל</Text>
      <Button
        title="הוסף מוצר ראשון"
        onPress={() => router.push('/products/add')}
        variant="primary"
        size="md"
      />
    </View>
  );

  return (
    <View
      className="flex-1"
      style={{
        direction: 'rtl',
        paddingTop: getAndroidTopInset(insets),
        backgroundColor: '#F3F4F6',
      }}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-left text-gray-500">טוען מוצרים...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 12,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          {products.length === 0 ? (
            <View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AddProductsTile />
                </View>
                <View style={{ flex: 1 }} />
              </View>
              {renderEmptyState()}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              {/* Right column (in RTL, first child renders right) */}
              <View style={{ flex: 1, gap: 10 }}>
                <AddProductsTile />
                {columnA.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    item={product}
                    aspectRatio={ASPECT_RATIOS[index % ASPECT_RATIOS.length]}
                  />
                ))}
              </View>
              {/* Left column */}
              <View style={{ flex: 1, gap: 10 }}>
                {columnB.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    item={product}
                    aspectRatio={ASPECT_RATIOS[(index + 2) % ASPECT_RATIOS.length]}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

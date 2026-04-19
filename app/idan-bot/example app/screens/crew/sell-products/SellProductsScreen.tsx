import { getProducts } from '@/services/crew/products';
import { AppEmptyState } from '@/shared/ui/base/empty-state';
import Stepper from '@/shared/ui/molecules/stepper';
import { useSellProductsStore } from '@/stores/sellProductsStore';
import { Product } from '@/types/products';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_CATEGORY = 'הכל';

export default function SellProductsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

  const cart = useSellProductsStore((s) => s.cart);
  const addToCart = useSellProductsStore((s) => s.addToCart);
  const updateQuantity = useSellProductsStore((s) => s.updateQuantity);
  const getCartQuantity = useSellProductsStore((s) => s.getCartQuantity);
  const totalItems = useSellProductsStore((s) => s.totalItems);
  const totalAmount = useSellProductsStore((s) => s.totalAmount);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await getProducts();
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableProducts = useMemo(
    () => products.filter((p) => p.in_stock && (p.stock_quantity == null || p.stock_quantity > 0)),
    [products]
  );

  const categories = useMemo(() => {
    const unique = [
      ...new Set(availableProducts.map((p) => p.category).filter(Boolean)),
    ] as string[];
    return [ALL_CATEGORY, ...unique];
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = availableProducts;

    const selectedCategory = categories[selectedCategoryIndex];
    if (selectedCategory && selectedCategory !== ALL_CATEGORY) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [availableProducts, selectedCategoryIndex, categories, searchQuery]);

  const navigateToCart = useCallback(() => {
    router.push('/(crew)/sell-products/cart');
  }, []);

  const renderProduct = ({ item }: { item: Product }) => {
    const quantity = getCartQuantity(item.id);

    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1, padding: 6 }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <View style={{ position: 'relative' }}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={{ height: 120, width: '100%', borderRadius: 12 }}
                contentFit="contain"
                transition={300}
              />
            ) : (
              <View
                style={{
                  height: 120,
                  width: '100%',
                  borderRadius: 12,
                  backgroundColor: '#f5f5f5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="cube-outline" size={32} color="#d4d4d4" />
              </View>
            )}
            {quantity > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  backgroundColor: '#171717',
                  borderRadius: 12,
                  minWidth: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{quantity}</Text>
              </View>
            )}
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#171717',
              textAlign: 'center',
              marginTop: 8,
            }}
            numberOfLines={2}>
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#171717',
              textAlign: 'center',
              marginTop: 2,
            }}>
            ₪{item.price}
          </Text>

          <View style={{ marginTop: 10 }}>
            {quantity > 0 ? (
              <View style={{ alignItems: 'center' }}>
                <Stepper
                  value={quantity}
                  onValueChange={(val) => updateQuantity(item.id, val)}
                  min={0}
                  max={99}
                  size={34}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => addToCart(item)}
                style={{
                  backgroundColor: '#171717',
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>הוסף</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={{ marginTop: 16, color: '#a3a3a3' }}>טוען מוצרים...</Text>
      </View>
    );
  }

  const cartItemCount = totalItems();
  const cartTotal = totalAmount();

  return (
    <>
      <Stack.SearchBar
        placeholder="חיפוש מוצרים..."
        onChangeText={(e) => setSearchQuery(e.nativeEvent.text)}
        hideWhenScrolling={false}
        hideNavigationBar={false}
      />

      <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
        {/* Category Chips */}
        {categories.length > 1 && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ paddingTop: insets.top }}
              contentContainerClassName="pt-4 pb-2 px-6 gap-2">
              {categories.map((cat, index) => {
                const isActive = selectedCategoryIndex === index;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategoryIndex(index)}
                    style={{
                      backgroundColor: isActive ? '#171717' : '#f5f5f5',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: isActive ? '#fff' : '#525252',
                      }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <FlashList
            data={filteredProducts}
            renderItem={renderProduct}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: 10,
              paddingLeft: 10,
              paddingRight: 10,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            extraData={cart}
          />
        ) : (
          <AppEmptyState
            title="לא נמצאו מוצרים"
            description={searchQuery ? 'נסה חיפוש אחר' : 'אין מוצרים זמינים כרגע'}
            icon={<Ionicons name="storefront-outline" size={34} color="#737373" />}
          />
        )}

        {/* Cart FAB */}
        {cartItemCount > 0 && (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            className="left-6"
            style={{
              position: 'absolute',
              bottom: insets.bottom * 2.5,
            }}>
            <Pressable
              onPress={navigateToCart}
              style={{
                backgroundColor: '#171717',
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6,
              }}>
              <FontAwesome6 name="basket-shopping" size={22} color="#fff" />
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  borderRadius: 11,
                  minWidth: 22,
                  height: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {cartItemCount}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </>
  );
}

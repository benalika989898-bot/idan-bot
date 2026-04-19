import { Product, UpdateProductData } from '@/types/products';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { toast } from 'sonner-native';

import {
  deleteProduct as deleteProductService,
  getProduct as fetchProduct,
  updateProduct as updateProductService,
} from '@/services/crew/products';

import {
  EMPTY_PRODUCT_FORM,
  ProductForm,
  ProductFormValues,
} from './components/ProductForm';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const [formData, setFormData] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const result = await fetchProduct(id!);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        in_stock: product.in_stock ?? true,
        stock_quantity: product.stock_quantity?.toString() || '',
        image_url: product.image_url || '',
        base64: '',
      });
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: (productData: UpdateProductData) => updateProductService(id!, productData),
    onSuccess: (result) => {
      if (result.error) {
        toast.error('שגיאה בעדכון המוצר');
        return;
      }
      toast.success('המוצר עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      router.back();
    },
    onError: (error: any) => {
      console.error('Error updating product:', error);
      toast.error('שגיאה בעדכון המוצר');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => deleteProductService(id!),
    onSuccess: (result) => {
      if (result.error) {
        toast.error('שגיאה במחיקת המוצר');
        return;
      }
      toast.success('המוצר נמחק בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (error: any) => {
      console.error('Error deleting product:', error);
      toast.error('שגיאה במחיקת המוצר');
    },
  });

  const hasChanges = useMemo(() => {
    if (!product) return false;
    return (
      formData.name !== (product.name || '') ||
      formData.description !== (product.description || '') ||
      formData.price !== (product.price?.toString() || '') ||
      formData.category !== (product.category || '') ||
      formData.in_stock !== (product.in_stock ?? true) ||
      formData.stock_quantity !== (product.stock_quantity?.toString() || '') ||
      formData.image_url !== (product.image_url || '') ||
      formData.base64 !== ''
    );
  }, [formData, product]);

  const isFormValid = useMemo(() => {
    return formData.name.trim() && formData.price.trim() && !isNaN(Number(formData.price));
  }, [formData.name, formData.price]);

  const isSubmitDisabled = !isFormValid || !hasChanges || updateProductMutation.isPending;

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('נא למלא שם מוצר');
      return;
    }
    if (!formData.price.trim() || isNaN(Number(formData.price))) {
      toast.error('נא למלא מחיר תקין');
      return;
    }
    if (formData.stock_quantity.trim() && isNaN(Number(formData.stock_quantity))) {
      toast.error('נא למלא כמות מלאי תקינה');
      return;
    }

    const parsedStockQuantity =
      formData.stock_quantity.trim() === '' ? null : Math.max(Number(formData.stock_quantity), 0);
    const resolvedInStock =
      formData.stock_quantity.trim() === '' ? formData.in_stock : parsedStockQuantity! > 0;

    const productData: UpdateProductData = {
      name: formData.name,
      description: formData.description || undefined,
      price: Number(formData.price),
      category: formData.category || undefined,
      in_stock: resolvedInStock,
      stock_quantity: parsedStockQuantity,
      image_url: formData.image_url || undefined,
      base64: formData.base64 || undefined,
    };

    updateProductMutation.mutate(productData);
  };

  const handleDelete = () => {
    Alert.alert('מחיקת מוצר', 'האם אתה בטוח שברצונך למחוק את המוצר? פעולה זו לא ניתנת לביטול.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => deleteProductMutation.mutate(),
      },
    ]);
  };

  const updateField = <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={handleSave} disabled={isSubmitDisabled}>
          <Text
            className={`text-base font-semibold ${
              isSubmitDisabled ? 'text-gray-400' : 'text-black'
            }`}>
            {updateProductMutation.isPending ? 'שומר...' : 'שמור'}
          </Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleDelete} disabled={deleteProductMutation.isPending}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={deleteProductMutation.isPending ? '#9CA3AF' : '#EF4444'}
          />
        </Pressable>
      ),
    });
  }, [
    isSubmitDisabled,
    updateProductMutation.isPending,
    deleteProductMutation.isPending,
    formData,
  ]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-left text-gray-500">טוען מוצר...</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-white"
      style={{ direction: 'rtl' }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      bottomOffset={40}>
      <ProductForm
        values={formData}
        onChange={updateField}
        isSubmitting={updateProductMutation.isPending}
      />
    </KeyboardAwareScrollView>
  );
}

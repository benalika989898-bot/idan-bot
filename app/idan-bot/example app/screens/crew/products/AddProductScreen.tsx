import { useAuth } from '@/contexts/AuthContext';
import { CreateProductData } from '@/types/products';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { toast } from 'sonner-native';

import { createProduct } from '@/services/crew/products';

import {
  EMPTY_PRODUCT_FORM,
  ProductForm,
  ProductFormValues,
} from './components/ProductForm';

export default function AddProductScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);

  const addProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (result) => {
      if (result.error) {
        toast.error('שגיאה בהוספת המוצר');
        return;
      }
      toast.success('המוצר נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (error: any) => {
      console.error('Error adding product:', error);
      toast.error('שגיאה בהוספת המוצר');
    },
  });

  const isFormValid = useMemo(() => {
    return formData.name.trim() && formData.price.trim() && !isNaN(Number(formData.price));
  }, [formData.name, formData.price]);

  const isButtonDisabled = addProductMutation.isPending || !isFormValid;
  const buttonTitle = addProductMutation.isPending ? 'שומר...' : 'שמור מוצר';

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

    const productData: CreateProductData = {
      name: formData.name,
      description: formData.description || undefined,
      price: Number(formData.price),
      category: formData.category || undefined,
      in_stock: resolvedInStock,
      stock_quantity: parsedStockQuantity,
      image_url: formData.image_url || undefined,
      base64: formData.base64 || undefined,
      user_id: user?.id!,
    };

    addProductMutation.mutate(productData);
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
        <Pressable onPress={handleSave} disabled={isButtonDisabled}>
          <Text
            className={`text-base font-semibold ${
              isButtonDisabled ? 'text-gray-400' : 'text-black'
            }`}>
            {buttonTitle}
          </Text>
        </Pressable>
      ),
    });
  }, [isButtonDisabled, buttonTitle, formData]);

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
        isSubmitting={addProductMutation.isPending}
      />
    </KeyboardAwareScrollView>
  );
}

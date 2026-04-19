import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  category: string;
  in_stock: boolean;
  stock_quantity: string;
  image_url: string;
  base64: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  category: '',
  in_stock: true,
  stock_quantity: '',
  image_url: '',
  base64: '',
};

interface ProductFormProps {
  values: ProductFormValues;
  onChange: <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => void;
  isSubmitting?: boolean;
}

export function ProductForm({ values, onChange, isSubmitting = false }: ProductFormProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      onChange('image_url', result.assets[0].uri);
      onChange('base64', result.assets[0].base64 || '');
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      onChange('image_url', result.assets[0].uri);
      onChange('base64', result.assets[0].base64 || '');
    }
  };

  const showImageOptions = () => {
    Alert.alert('תמונת המוצר', 'בחר איך תרצה להוסיף תמונה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מהגלריה', onPress: pickImage },
      { text: 'צלם עכשיו', onPress: takePhoto },
    ]);
  };

  const removeImage = () => {
    onChange('image_url', '');
    onChange('base64', '');
  };

  return (
    <View>
      {/* Product Image */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">תמונת המוצר</Text>
        <View className="items-center">
          {values.image_url ? (
            <View style={{ width: 200, height: 200 }}>
              <Image
                source={{ uri: values.image_url }}
                style={{ width: '100%', height: '100%', borderRadius: 24 }}
                contentFit="cover"
                transition={250}
              />
              <Pressable
                onPress={removeImage}
                disabled={isSubmitting}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: '#111111',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isSubmitting ? 0.5 : 1,
                }}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={showImageOptions}
                disabled={isSubmitting}
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(17,17,17,0.85)',
                  opacity: isSubmitting ? 0.5 : 1,
                }}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
                <Text className="text-xs font-medium text-white">החלף</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={showImageOptions}
              disabled={isSubmitting}
              style={{
                width: 200,
                height: 200,
                opacity: isSubmitting ? 0.5 : 1,
              }}>
              <LinearGradient
                colors={['#FFFFFF', '#F0EDE7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="camera-outline" size={26} color="#111111" />
                </View>
                <Text className="text-sm font-medium text-gray-700">הוסף תמונה</Text>
                <Text className="text-xs text-gray-500">JPG · PNG</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Product Name */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">שם המוצר *</Text>
        <TextInput
          value={values.name}
          onChangeText={(text) => onChange('name', text)}
          placeholder="למשל: שמפו מקצועי"
          placeholderTextColor="#9ca3af"
          editable={!isSubmitting}
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
        />
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Description */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">תיאור</Text>
        <TextInput
          value={values.description}
          onChangeText={(text) => onChange('description', text)}
          placeholder="תיאור קצר של המוצר..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          editable={!isSubmitting}
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
          textAlignVertical="top"
        />
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Price */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">מחיר (₪) *</Text>
        <TextInput
          value={values.price}
          onChangeText={(text) => onChange('price', text)}
          placeholder="0"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          editable={!isSubmitting}
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
        />
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Stock Quantity */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">כמות במלאי</Text>
        <TextInput
          value={values.stock_quantity}
          onChangeText={(text) => onChange('stock_quantity', text)}
          placeholder="למשל: 12"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          editable={!isSubmitting}
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
        />
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* Category */}
      <View className="gap-2 px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">קטגוריה</Text>
        <TextInput
          value={values.category}
          onChangeText={(text) => onChange('category', text)}
          placeholder="למשל: שמפו, מסכות, סרום"
          placeholderTextColor="#9ca3af"
          editable={!isSubmitting}
          className="rounded-lg bg-gray-50 px-4 py-3 text-right text-gray-900"
        />
      </View>

      <View className="px-6">
        <View className="h-px bg-gray-100" />
      </View>

      {/* In Stock Toggle */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-left text-xs font-medium text-gray-500">במלאי</Text>
        <Switch
          value={values.in_stock}
          onValueChange={(value) => onChange('in_stock', value)}
          disabled={isSubmitting}
          trackColor={{ false: '#f3f4f6', true: '#10b981' }}
          thumbColor="#ffffff"
        />
      </View>
    </View>
  );
}

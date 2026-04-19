import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

interface ImageSectionProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  onEdit: () => void;
  onRemove?: () => void;
  isAvatar?: boolean;
  isLoading?: boolean;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  title,
  subtitle,
  imageUrl,
  onEdit,
  onRemove,
  isAvatar = false,
  isLoading = false,
}) => (
  <View className="overflow-hidden rounded-xl bg-white shadow-sm">
    <View className="border-b border-gray-100 px-4 py-3">
      <Text className="text-left text-base font-medium text-gray-900" style={{ direction: 'rtl' }}>
        {title}
      </Text>
      <Text className="text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
        {subtitle}
      </Text>
    </View>

    <View className="p-4">
      {imageUrl ? (
        <View>
          {isAvatar ? (
            <View className="mb-4 items-center">
              <View className="h-32 w-32 overflow-hidden rounded-full bg-gray-100">
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={1000}
                />
              </View>
            </View>
          ) : (
            <View className="mb-4 h-48 w-full overflow-hidden rounded-xl bg-gray-100">
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: isLoading ? 0.6 : 1,
                }}
                contentFit="contain"
              />
              {isLoading && (
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
            </View>
          )}
          <View className="flex-row gap-3">
            <Pressable
              onPress={onEdit}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-black py-3"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#1f1f1f' : '#000',
                opacity: isLoading ? 0.6 : 1,
              })}>
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-center font-medium text-white">החלף תמונה</Text>
              )}
            </Pressable>
            {onRemove && (
              <Pressable
                onPress={onRemove}
                disabled={isLoading}
                className="rounded-xl bg-gray-100 px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#e5e7eb' : '#f3f4f6',
                  opacity: isLoading ? 0.6 : 1,
                })}>
                <Ionicons name="trash-outline" size={18} color="#6b7280" />
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onEdit}
          disabled={isLoading}
          className={`items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 ${
            isAvatar ? 'mx-auto h-32 w-32 rounded-full' : 'h-48 w-full rounded-xl'
          }`}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#f9fafb' : '#fafafa',
            borderColor: pressed ? '#d1d5db' : '#e5e7eb',
            opacity: isLoading ? 0.6 : 1,
          })}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#6b7280" />
          ) : (
            <View className="items-center">
              <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Ionicons
                  name={isAvatar ? 'person-outline' : 'image-outline'}
                  size={24}
                  color="#6b7280"
                />
              </View>
              <Text className="text-sm font-medium text-gray-600">הוסף תמונה</Text>
              <Text className="mt-1 text-xs text-gray-400">גע כדי לבחור מהגלריה</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  </View>
);

import React from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { Ionicons } from '@expo/vector-icons';
import { updateAppSettings } from '@/services/settings';

interface SocialRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  currentUrl?: string;
  urlKey: 'whatsapp_url' | 'instagram_url' | 'facebook_url' | 'tiktok_url' | 'waze_url';
  placeholder: string;
  iconColor: string;
}

export const SocialRow: React.FC<SocialRowProps> = ({
  icon,
  title,
  subtitle,
  currentUrl,
  urlKey,
  placeholder,
  iconColor,
}) => {
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: () => {
      toast.success('הקישור עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון הקישור');
    },
  });

  const handleEdit = () => {
    Alert.prompt(
      title,
      subtitle,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'שמור',
          onPress: (url) => {
            if (url !== undefined) {
              const trimmedUrl = url.trim();
              updateSettingsMutation.mutate({ [urlKey]: trimmedUrl || null });
            }
          },
        },
      ],
      'plain-text',
      currentUrl || placeholder
    );
  };

  const handleRemove = () => {
    Alert.alert(
      'הסרת קישור',
      `האם אתה בטוח שברצונך להסיר את הקישור ל${title}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: () => {
            updateSettingsMutation.mutate({ [urlKey]: null });
          },
        },
      ]
    );
  };

  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
      <View className="border-b border-gray-100 px-4 py-3">
        <View className="flex-row items-center">
          <View className="ml-3 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${iconColor}20` }}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-left text-base font-medium text-gray-900" style={{ direction: 'rtl' }}>
              {title}
            </Text>
            <Text className="text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
              {subtitle}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="p-4">
        {currentUrl ? (
          <View>
            <View className="mb-4 rounded-xl bg-gray-50 p-3">
              <Text className="text-left text-sm text-gray-700" numberOfLines={2}>
                {currentUrl}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleEdit}
                className="flex-1 rounded-xl py-3"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? `${iconColor}CC` : iconColor,
                })}>
                <Text className="text-center font-medium text-white">
                  עדכן קישור
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRemove}
                className="rounded-xl bg-gray-100 px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#e5e7eb' : '#f3f4f6',
                })}>
                <Ionicons name="trash-outline" size={18} color="#6b7280" />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={handleEdit}
            className="h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
            style={({ pressed }) => ({
              borderColor: `${iconColor}40`,
              backgroundColor: pressed ? '#f9fafb' : '#fafafa',
            })}>
            <View className="items-center">
              <View className="mb-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${iconColor}20` }}>
                <Ionicons name="link" size={16} color={iconColor} />
              </View>
              <Text className="text-sm font-medium" style={{ color: iconColor }}>
                הוסף קישור
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
};

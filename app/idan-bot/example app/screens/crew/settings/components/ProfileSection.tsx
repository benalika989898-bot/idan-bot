import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useProfile } from '@/hooks/useProfile';

export const ProfileSection: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const { isUploading, uploadProfileImage } = useProfile({
    onSuccess: () => {
      toast.success('תמונת הפרופיל עודכנה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון תמונת הפרופיל');
    },
  });

  const handleAvatarEdit = async () => {
    await uploadProfileImage();
  };

  const handleShare = async (url?: string | null) => {
    if (!url) {
      return;
    }

    try {
      await Share.share(Platform.OS === 'ios' ? { url } : { message: url });
    } catch {
      toast.error('שגיאה בשיתוף הקישור');
    }
  };

  return (
    <View className="px-4 py-6">
      <View className="items-center">
        <View className="relative mb-3">
          <Pressable
            onPress={handleAvatarEdit}
            disabled={isUploading}
            className="h-40 w-40 overflow-hidden rounded-full bg-gray-200"
            style={({ pressed }) => ({
              opacity: pressed || isUploading ? 0.6 : 1,
            })}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="person" size={32} color="#999" />
              </View>
            )}

            {/* Loading indicator */}
            {isUploading && (
              <View className="absolute inset-0 items-center justify-center bg-black/20">
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
          </Pressable>

          {/* Camera overlay - positioned outside the circle */}
          {!isUploading && (
            <View className="absolute bottom-2 right-2 h-10 w-10 items-center justify-center rounded-full bg-black shadow-md">
              <Ionicons name="camera" size={16} color="white" />
            </View>
          )}
        </View>
        <Text className="text-xl font-semibold text-gray-900">{user?.full_name || 'ללא שם'}</Text>
        <Text className="mt-1 text-sm text-gray-500">
          {user?.role === 'admin' ? 'בעלים' : 'איש צוות'}
        </Text>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => handleShare(settings?.app_site_url)}
            disabled={!settings?.app_site_url}
            className="min-h-11 min-w-36 flex-row items-center justify-center rounded-full border border-black px-5 py-3"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#f3f4f6' : '#fff',
              opacity: settings?.app_site_url ? 1 : 0.4,
            })}>
            <Ionicons name="globe-outline" size={16} color="#111827" />
            <Text className="ml-2 text-sm font-semibold text-gray-900">שתף אתר</Text>
          </Pressable>
          <Pressable
            onPress={() => handleShare(settings?.app_share_url)}
            disabled={!settings?.app_share_url}
            className="min-h-11 min-w-36 flex-row items-center justify-center rounded-full border border-black px-5 py-3"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#f3f4f6' : '#fff',
              opacity: settings?.app_share_url ? 1 : 0.4,
            })}>
            <Ionicons name="share-social-outline" size={16} color="#111827" />
            <Text className="ml-2 text-sm font-semibold text-gray-900">שתף אפליקציה</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

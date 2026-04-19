import { getAppSettings } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialRow } from './Social/SocialRow';

export default function SocialSettingsScreen() {
  const insets = useSafeAreaInsets();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await getAppSettings();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">טוען הגדרות...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="mt-6">
        <SocialRow
          icon="logo-whatsapp"
          title="WhatsApp"
          subtitle="קישור לשיחה בוואטסאפ"
          currentUrl={settings?.whatsapp_url}
          urlKey="whatsapp_url"
          placeholder="https://wa.me/9725XXXXXXXX"
          iconColor="#25D366"
        />

        <SocialRow
          icon="logo-instagram"
          title="Instagram"
          subtitle="קישור לפרופיל אינסטגרם"
          currentUrl={settings?.instagram_url}
          urlKey="instagram_url"
          placeholder="https://instagram.com/username"
          iconColor="#E1306C"
        />

        <SocialRow
          icon="logo-facebook"
          title="Facebook"
          subtitle="קישור לעמוד פייסבוק"
          currentUrl={settings?.facebook_url}
          urlKey="facebook_url"
          placeholder="https://facebook.com/page"
          iconColor="#1877F2"
        />

        <SocialRow
          icon="logo-tiktok"
          title="TikTok"
          subtitle="קישור לפרופיל טיקטוק"
          currentUrl={settings?.tiktok_url}
          urlKey="tiktok_url"
          placeholder="https://tiktok.com/@username"
          iconColor="#000000"
        />

        <SocialRow
          icon="navigate"
          title="Waze"
          subtitle="קישור לניווט במפות Waze"
          currentUrl={settings?.waze_url}
          urlKey="waze_url"
          placeholder="https://waze.com/ul?ll=latitude,longitude"
          iconColor="#33CCFF"
        />
      </View>

      {/* Info Section */}
      <View className="mx-4 mt-6 overflow-hidden rounded-xl bg-gray-50">
        <View className="p-4">
          <View className="mb-3 flex-row items-center">
            <View className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
              <Ionicons name="information" size={16} color="#6b7280" />
            </View>
            <Text
              className="flex-1 text-left text-sm font-medium text-gray-800"
              style={{ direction: 'rtl' }}>
              מידע חשוב
            </Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row items-start">
              <View className="ml-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
              <Text className="flex-1 text-left text-xs text-gray-600" style={{ direction: 'rtl' }}>
                הקישורים יופיעו בתחתית הדף הראשי של האפליקציה
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="ml-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
              <Text className="flex-1 text-left text-xs text-gray-600" style={{ direction: 'rtl' }}>
                ודא שהקישורים תקינים לפני השמירה
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="ml-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
              <Text className="flex-1 text-left text-xs text-gray-600" style={{ direction: 'rtl' }}>
                קישורי Waze: השתמש בקישור ישיר מהאפליקציה
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

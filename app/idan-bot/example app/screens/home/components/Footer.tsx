import { View, Pressable, Linking } from 'react-native';
import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';

const Footer = () => {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const handleLinkPress = async (url: string | null) => {
    if (!url) return;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  // Only show social icons if URLs are configured
  const socialItems = [
    {
      name: 'whatsapp',
      url: settings?.whatsapp_url,
      color: '#25D366',
    },
    {
      name: 'instagram',
      url: settings?.instagram_url,
      color: '#E1306C',
    },
    {
      name: 'facebook',
      url: settings?.facebook_url,
      color: '#1877F2',
    },
    {
      name: 'tiktok',
      url: settings?.tiktok_url,
      color: '#000000',
    },
    {
      name: 'waze',
      url: settings?.waze_url,
      color: '#33CCFF',
    },
  ].filter((item) => item.url); // Only show items with URLs

  if (socialItems.length === 0) {
    return null; // Don't show footer if no social links are configured
  }

  return (
    <View style={{ paddingBottom: insets.bottom }} className="px-4 pb-4 pt-2">
      <View className="flex-row items-center justify-center gap-6">
        {socialItems.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => handleLinkPress(item.url)}
            className="transition-all duration-200 active:scale-95 active:opacity-80"
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}>
            <FontAwesome5 name={item.name as any} size={24} color="black" />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default Footer;

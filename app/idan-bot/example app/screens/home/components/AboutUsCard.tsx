import { useSettings } from '@/contexts/SettingsContext';
import { FlipCard } from '@/shared/ui/base/flip-card';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const AboutUsCard = () => {
  const { settings } = useSettings();
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = screenWidth - 32;
  const cardHeight = 240;

  const aboutImage = settings?.about_image_url
    ? { uri: settings.about_image_url }
    : require('@/assets/images/logo.jpg');

  return (
    <View className="items-center px-4">
      <FlipCard
        width={cardWidth}
        height={cardHeight}
        borderRadius={20}
        blurIntensity={60}
        blurTint="dark"
        animationDuration={500}>
        <FlipCard.Front>
          <Image source={aboutImage} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
            locations={[0.2, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View className="flex-1 justify-end p-5">
            <Text className="text-left text-2xl font-bold text-white">
              {settings?.business_name || 'קצת עלינו'}
            </Text>
            <View className="mt-2 flex-row items-center gap-1.5">
              <Text className="text-sm text-white/60">לחצו לפרטים נוספים</Text>
              <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.5)" />
            </View>
          </View>
        </FlipCard.Front>

        <FlipCard.Back style={{ backgroundColor: '#111827' }}>
          <View className="flex-1 justify-center gap-4 p-6" style={{ direction: 'rtl' }}>
            {settings?.about_text ? (
              <Text className="mb-1 text-center text-sm leading-6 text-white/80">
                {settings.about_text}
              </Text>
            ) : settings?.business_description ? (
              <Text className="mb-1 text-center text-sm leading-6 text-white/80" numberOfLines={3}>
                {settings.business_description}
              </Text>
            ) : null}

            {settings?.phone_number && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${settings.phone_number}`)}
                className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Ionicons name="call-outline" size={18} color="white" />
                </View>
                <Text className="text-base text-white">{settings.phone_number}</Text>
              </Pressable>
            )}
            {settings?.email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${settings.email}`)}
                className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Ionicons name="mail-outline" size={18} color="white" />
                </View>
                <Text className="text-base text-white">{settings.email}</Text>
              </Pressable>
            )}
            {settings?.address && (
              <Pressable
                onPress={() =>
                  settings.waze_url
                    ? Linking.openURL(settings.waze_url)
                    : Linking.openURL(
                        `https://maps.google.com/?q=${encodeURIComponent(settings.address)}`
                      )
                }
                className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Ionicons name="location-outline" size={18} color="white" />
                </View>
                <Text className="text-base text-white">{settings.address}</Text>
              </Pressable>
            )}
          </View>
        </FlipCard.Back>

        <FlipCard.Trigger />
      </FlipCard>
    </View>
  );
};

export default AboutUsCard;

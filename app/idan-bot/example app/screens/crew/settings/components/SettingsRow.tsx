import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  iconColor?: string;
  value?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  iconColor = '#007AFF',
  value,
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center gap-2 border-b border-gray-100 bg-white px-4 py-3"
    style={({ pressed }) => ({
      backgroundColor: pressed ? '#f2f2f2' : '#fff',
    })}>
    <View className="h-8 w-8 items-center justify-center">
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>

    <View className="flex-1">
      <Text className="text-left text-base font-medium text-gray-900" style={{ direction: 'rtl' }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="mt-0.5 text-left text-sm text-gray-500" style={{ direction: 'rtl' }}>
          {subtitle}
        </Text>
      )}
    </View>

    <View className="flex-row items-center">
      {value && <Text className="mr-2 text-base text-gray-500">{value}</Text>}
      {showChevron && <Ionicons name="chevron-back" size={16} color="#C7C7CC" />}
    </View>
  </Pressable>
);
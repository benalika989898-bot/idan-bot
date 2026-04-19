import React from 'react';
import { View, Text } from 'react-native';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View className="mt-6">
    {title && (
      <Text className="px-4 py-2 text-left text-sm font-medium uppercase tracking-wide text-gray-500">
        {title}
      </Text>
    )}
    <View className="mx-4 overflow-hidden rounded-lg bg-white shadow-sm">{children}</View>
  </View>
);
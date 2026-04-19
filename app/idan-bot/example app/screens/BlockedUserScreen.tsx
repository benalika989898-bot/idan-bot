import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function BlockedUserScreen() {
  const { signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <Ionicons name="ban-outline" size={28} color="#DC2626" />
      </View>
      <Text
        className="text-center text-xl font-semibold text-gray-900"
        style={{ direction: 'rtl' }}>
        החשבון נחסם
      </Text>
      <View style={{ height: 8 }} />
      <Text className="text-center text-base text-gray-500" style={{ direction: 'rtl' }}>
        החשבון שלך נחסם. צור קשר עם הבעלים כדי להבין את הסיבה ולפתור את הבעיה.
      </Text>
      <View style={{ height: 20 }} />
      <Pressable onPress={signOut} className="rounded-full bg-black px-6 py-3">
        <Text className="text-center text-base font-medium text-white">התנתק</Text>
      </Pressable>
    </View>
  );
}

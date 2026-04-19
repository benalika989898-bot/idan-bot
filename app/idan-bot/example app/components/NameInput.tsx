import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

interface NameInputProps {
  phone: string;
  onCompleted: () => void;
  onBack: () => void;
}

export default function NameInput({ phone, onCompleted, onBack }: NameInputProps) {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const isValidName = (name: string) => {
    return name.trim().length >= 2;
  };

  const displayPhone = (e164: string) => {
    let phone = e164;
    if (phone.startsWith('+972')) {
      phone = phone.replace('+972', '0');
    }
    return phone;
  };

  const saveName = async () => {
    if (!isValidName(fullName)) {
      setErrorMessage('אנא הכנס שם מלא תקין');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('לא ניתן לזהות את המשתמש');
      }

      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Refresh user context
      await refreshUser();
      
      onCompleted();
    } catch (error: any) {
      console.error('Error saving name:', error);
      setErrorMessage('שגיאה בשמירת הפרטים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      className="flex-1 bg-gray-50">
      <View className="flex-1 px-6" style={{ justifyContent: 'space-between' }}>
        {/* Top Section */}
        <View>
          {/* Back Button */}
          <Animated.View 
            entering={FadeInDown.delay(100)} 
            className="pb-4 pt-12">
            <Pressable 
              className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" 
              onPress={onBack}>
              <Ionicons name="arrow-forward" size={20} color="#374151" />
            </Pressable>
          </Animated.View>

          {/* Logo */}
          <Animated.View 
            entering={FadeInDown.delay(200)} 
            className="items-center pb-8 pt-8">
            <Image
              source={require('@/assets/images/logo.jpg')}
              className="h-20 w-28"
              resizeMode="contain"
            />
          </Animated.View>

          {/* Header */}
          <Animated.View 
            entering={FadeInDown.delay(300)} 
            className="mb-8 items-center">
            <Text className="mb-3 text-2xl font-semibold text-gray-900">
              כמעט סיימנו!
            </Text>
            <Text className="mb-2 text-center text-base leading-6 text-gray-600">
              אנא הכנס את שמך המלא כדי להשלים
            </Text>
            <Text className="text-center text-base leading-6 text-gray-600">
              את הרישום עבור {displayPhone(phone)}
            </Text>
          </Animated.View>

          {/* Name Input */}
          <Animated.View entering={SlideInRight.delay(400).springify()}>
            <View
              className="mx-2 rounded-2xl bg-white p-6"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}>
              <View className="mb-3">
                <Text className="text-right text-sm font-medium text-gray-700">שם מלא</Text>
              </View>
              <TextInput
                className="text-right text-gray-900"
                style={{ fontSize: 18, lineHeight: 24 }}
                placeholder="הכנס את שמך המלא"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
                keyboardType="default"
                editable={!loading}
                autoFocus
                autoCapitalize="words"
              />
            </View>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <View>
          {/* Error Message */}
          {errorMessage && (
            <Animated.View 
              entering={FadeInDown} 
              className="mb-4 px-4">
              <Text className="text-center text-sm text-red-500">{errorMessage}</Text>
            </Animated.View>
          )}

          {/* Complete Button */}
          <Animated.View 
            entering={FadeInDown.delay(500)} 
            className="px-2 pb-8">
            <Pressable
              className={`rounded-2xl py-4 ${
                isValidName(fullName) && !loading ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
              onPress={saveName}
              disabled={!isValidName(fullName) || loading}
              style={{
                shadowColor: isValidName(fullName) && !loading ? '#3B82F6' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}>
              <View className="flex-row items-center justify-center">
                {loading && <ActivityIndicator size="small" color="white" className="ml-2" />}
                <Text className="text-lg font-semibold text-white">
                  {loading ? 'שומר...' : 'השלם רישום'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhoneInputProps {
  onOtpSent: (phone: string) => void;
}

function formatPhoneNumber(text: string) {
  return text.replace(/\D/g, '').slice(0, 10);
}

function formattedE164(input: string) {
  const digits = input.replace(/[^0-9]/g, '');

  if (digits.startsWith('0') && digits.length === 10) {
    return '+972' + digits.substring(1);
  }

  if (digits.startsWith('972') && digits.length === 12) {
    return '+' + digits;
  }

  if (input.startsWith('+972') && /^\+9725\d{8}$/.test(input)) {
    return input;
  }

  return null;
}

function isValidPhone(input: string) {
  const formatted = formattedE164(input);
  if (!formatted) {
    return false;
  }

  return /^\+9725\d{8}$/.test(formatted);
}

export default function PhoneInput({ onOtpSent }: PhoneInputProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardOpen(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardOpen(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const sendOtp = async () => {
    const formatted = formattedE164(phone);

    if (!formatted) {
      setErrorMessage('מספר טלפון לא תקין');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });

      if (error) {
        setErrorMessage(`שליחת קוד נכשלה: ${error.message}`);
      } else {
        onOtpSent(formatted);
      }
    } catch {
      setErrorMessage('שליחת קוד נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}>
        <View
          className="flex-1 px-6"
          style={{
            justifyContent: 'space-between',
            paddingTop: insets.top * 2,
            paddingBottom: !isKeyboardOpen ? Math.max(insets.bottom, 24) : 0,
          }}>
          <View className="gap-4">
            <Animated.View entering={FadeInDown.delay(200)} style={styles.centeredHeader}>
            <Text className="text-left text-3xl font-bold text-gray-900">ברוכים הבאים</Text>
            <Text className="text-left text-lg leading-7 text-gray-600">
              הכנס את מספר הטלפון שלך כדי להתחיל
            </Text>
            </Animated.View>

            <Animated.View entering={SlideInRight.delay(300).springify()}>
              <View
                className="rounded-2xl bg-white p-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 4,
              }}>
                <View className="mb-3">
                  <Text className="text-left text-sm font-medium text-gray-700">מספר טלפון</Text>
                </View>
                <TextInput
                  className="text-left text-gray-900"
                  style={{ fontSize: 16, lineHeight: 20, fontWeight: '600', textAlign: 'left' }}
                  placeholder="050-123-4567"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!loading}
                  autoFocus
                />
              </View>
            </Animated.View>
          </View>

          <View>
            {errorMessage ? (
              <Animated.View entering={FadeInDown} style={styles.errorWrap}>
                <Text className="text-left text-sm text-red-500">{errorMessage}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(400)} style={styles.bottomWrap}>
              <Pressable
                className={`rounded-2xl py-4 ${
                  isValidPhone(phone) && !loading ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
                onPress={sendOtp}
                disabled={!isValidPhone(phone) || loading}
                style={{
                  shadowColor: isValidPhone(phone) && !loading ? '#4F46E5' : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}>
                <View className="flex-row items-center justify-center">
                  <Text className="text-left text-lg font-bold text-white">{loading ? 'שולח...' : 'המשך'}</Text>
                  {loading ? <ActivityIndicator size="small" color="white" style={styles.loader} /> : null}
                </View>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredHeader: {
    alignItems: 'center',
    rowGap: 4,
  },
  errorWrap: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  bottomWrap: {
    paddingBottom: 32,
  },
  loader: {
    marginLeft: 8,
  },
});

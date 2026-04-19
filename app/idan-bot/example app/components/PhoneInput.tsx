import { supabase } from '@/lib/supabase';
import { getAndroidBottomInset } from '@/utils/androidInsets';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhoneInputProps {
  onOtpSent: (phone: string) => void;
}

export default function PhoneInput({ onOtpSent }: PhoneInputProps) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardOpen(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardOpen(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 300);
  }, []);

  useEffect(() => {
    const checkPhoneExists = async () => {
      if (!isValidPhone(phone)) {
        setPhoneExists(null);
        setShowNameInput(false);
        return;
      }

      const formatted = formattedE164(phone);
      if (!formatted) return;

      setCheckingPhone(true);
      setErrorMessage(null);

      try {
        console.log('Checking phone:', formatted); // Debug log

        // Try both with and without + prefix since DB might store either format
        const queries = [
          supabase.from('profiles').select('id, full_name, phone').eq('phone', formatted).single(),
          supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('phone', formatted.substring(1))
            .single(),
        ];

        const [withPlus, withoutPlus] = await Promise.all(queries);
        console.log('Query results:', { withPlus, withoutPlus }); // Debug log

        const { data, error } = withPlus.error ? withoutPlus : withPlus;

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which means phone doesn't exist
          console.error('Error checking phone:', error);
          setPhoneExists(false);
        } else if (data && data.full_name && data.full_name.trim().length > 0) {
          // Phone exists with complete profile and non-empty name
          setPhoneExists(true);
          setShowNameInput(false);
        } else {
          // Phone exists but no full name, or phone doesn't exist, or empty name
          setPhoneExists(false);
          setShowNameInput(true);
        }
      } catch (error) {
        console.error('Error checking phone:', error);
        setPhoneExists(false);
        setShowNameInput(true);
      } finally {
        setCheckingPhone(false);
      }
    };

    // Debounce the check by 500ms to avoid too many requests
    const timeoutId = setTimeout(checkPhoneExists, 500);
    return () => clearTimeout(timeoutId);
  }, [phone]);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  const formattedE164 = (input: string) => {
    const digits = input.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      return '+972' + digits.substring(1);
    }
    if (digits.startsWith('972')) {
      return '+' + digits;
    }
    if (input.startsWith('+')) {
      return input;
    }
    return null;
  };

  const isValidPhone = (input: string) => {
    const formatted = formattedE164(input);
    if (!formatted) return false;
    return /^\+9725\d{8}$/.test(formatted);
  };

  const sendOtp = async () => {
    const formatted = formattedE164(phone);
    if (!formatted) {
      setErrorMessage('מספר טלפון לא תקין');
      return;
    }

    // If phone doesn't exist and no name provided, require name
    if (phoneExists === false && (!fullName || fullName.trim().length < 2)) {
      setErrorMessage('אנא הכנס את שמך המלא');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // If phone doesn't exist, first create the profile
      if (phoneExists === false && fullName.trim().length >= 2) {
        // We'll create the profile after OTP verification
        // For now, just send the OTP
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });

      if (error) {
        setErrorMessage('שליחת קוד נכשלה: ' + error.message);
      } else {
        // Pass both phone and name to the next step
        onOtpSent(
          formatted + (phoneExists === false && fullName.trim() ? `|${fullName.trim()}` : '')
        );
      }
    } catch (error) {
      setErrorMessage('שליחת קוד נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (!isValidPhone(phone) || checkingPhone) {
      return false;
    }

    if (phoneExists === true) {
      return true; // Phone exists, can proceed
    }

    if (phoneExists === false) {
      return fullName.trim().length >= 2; // Phone doesn't exist, need valid name
    }

    return false; // Still checking or invalid state
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      className="flex-1 bg-gray-50">
      <View
        className="flex-1 px-6"
        style={{
          justifyContent: 'space-between',
          paddingTop: insets.top * 2,
          paddingBottom: !isKeyboardOpen ? getAndroidBottomInset(insets) : 0,
        }}>
        {/* Top Section */}
        <View className="gap-4">
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(200)} className="items-center gap-1">
            <Text className=" text-3xl font-bold text-gray-900">ברוכים הבאים</Text>
            <Text className="text-center text-lg leading-7 text-gray-600">
              הכנס את מספר הטלפון שלך כדי להתחיל
            </Text>
          </Animated.View>

          {/* Phone Input */}
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
                className="text-center text-gray-900"
                style={{ fontSize: 16, lineHeight: 20, fontWeight: '600' }}
                placeholder="050-123-4567"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading && !checkingPhone}
                autoFocus
              />
            </View>
          </Animated.View>

          {/* Name Input - Animated appearance */}
          {showNameInput && (
            <Animated.View entering={SlideInRight.delay(100).springify()} className="mt-4">
              <View
                className=" rounded-2xl bg-white p-4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 4,
                }}>
                <View className="mb-3">
                  <Text className="text-left text-sm font-medium text-gray-700">שם מלא</Text>
                </View>
                <TextInput
                  className="text-center text-gray-900"
                  style={{ fontSize: 14, lineHeight: 18, fontWeight: '500' }}
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
          )}
        </View>

        {/* Bottom Section */}
        <View>
          {/* Error Message */}
          {errorMessage && (
            <Animated.View entering={FadeInDown} className="mb-4 px-4">
              <Text className="text-center text-sm text-red-500">{errorMessage}</Text>
            </Animated.View>
          )}

          {/* Continue Button */}
          <Animated.View entering={FadeInDown.delay(400)} className=" pb-8">
            <Pressable
              className={`rounded-2xl py-4 ${
                canProceed() && !loading ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              onPress={sendOtp}
              disabled={!canProceed() || loading}
              style={{
                shadowColor: canProceed() && !loading ? '#4F46E5' : 'transparent',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}>
              <View className="flex-row items-center justify-center">
                <Text className="text-lg font-bold text-white">
                  {checkingPhone ? 'בודק...' : loading ? 'שולח...' : 'המשך'}
                </Text>
                {(loading || checkingPhone) && (
                  <ActivityIndicator size="small" color="white" className="ml-2" />
                )}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

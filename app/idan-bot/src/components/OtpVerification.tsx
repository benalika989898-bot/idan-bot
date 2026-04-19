import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';

interface OtpVerificationProps {
  phone: string;
  onBack: () => void;
}

function displayPhone(e164: string) {
  let phone = e164;
  if (phone.startsWith('+972')) {
    phone = phone.replace('+972', '0');
  }
  return phone;
}

export default function OtpVerification({ phone, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const verifyOtp = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp;

    if (codeToVerify.length !== 6) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: codeToVerify,
        type: 'sms',
      });

      if (error) {
        setErrorMessage('האימות נכשל: הקוד לא נכון');
      }
    } catch {
      setErrorMessage('נכשל באימות הקוד');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsResending(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        setErrorMessage('שליחת קוד נכשלה');
      } else {
        setCountdown(300);
        setCanResend(false);
        setOtp('');

        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setErrorMessage('נכשל בשליחת קוד אימות שוב');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View className="flex-1 px-6" style={{ direction: 'ltr', justifyContent: 'space-between' }}>
        <View>
          <View className="pb-4 pt-12">
            <Pressable className="h-10 w-10 items-center justify-center" onPress={onBack}>
              <Text className="text-left text-2xl text-gray-700">←</Text>
            </Pressable>
          </View>

          <View className="mb-8 mt-8 items-center">
            <Text className="mb-3 text-left text-2xl font-semibold text-gray-900">שלחנו לך SMS</Text>
            <View className="flex-row items-center">
              <Text className="text-left text-base text-gray-600">הכנס את קוד האימות ששלחנו אל</Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Text className="text-left text-base font-medium text-gray-900">{displayPhone(phone)}</Text>
              <Pressable className="ml-2" onPress={onBack}>
                <Text className="text-left text-base text-blue-500">✎</Text>
              </Pressable>
            </View>
          </View>

          <View className="mb-8">
            <OtpInput
              numberOfDigits={6}
              focusColor="#8B5CF6"
              focusStickBlinkingDuration={500}
              onTextChange={(text) => {
                setOtp(text);
              }}
              onFilled={(text) => {
                void verifyOtp(text);
              }}
              textInputProps={{
                accessibilityLabel: 'One-Time Password',
              }}
              theme={{
                containerStyle: {
                  justifyContent: 'space-between',
                  gap: 8,
                },
                pinCodeContainerStyle: {
                  width: 44,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                  marginHorizontal: 4,
                },
                pinCodeTextStyle: {
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#111827',
                },
                focusStickStyle: {
                  backgroundColor: '#8B5CF6',
                },
                focusedPinCodeContainerStyle: {
                  borderColor: '#8B5CF6',
                  borderWidth: 2,
                },
                filledPinCodeContainerStyle: {
                  borderColor: '#8B5CF6',
                  backgroundColor: '#F3F4F6',
                },
              }}
            />
          </View>
        </View>

        <View>
          {errorMessage ? (
            <View className="mb-4 px-4">
              <Text className="text-left text-sm text-red-500">{errorMessage}</Text>
            </View>
          ) : null}

          <View className="mb-6 px-2">
            <Pressable
              className={`rounded-2xl py-4 ${
                otp.length === 6 && !loading ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
              onPress={() => void verifyOtp()}
              disabled={otp.length < 6 || loading}
              style={{
                shadowColor: otp.length === 6 && !loading ? '#8B5CF6' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}>
              <View className="flex-row items-center justify-center">
                {loading ? <ActivityIndicator size="small" color="white" className="mr-2" /> : null}
                <Text className="text-left text-lg font-semibold text-white">
                  {loading ? 'מאמת...' : 'אמת'}
                </Text>
              </View>
            </Pressable>
          </View>

          <View className="items-center pb-8">
            <Text className="mb-2 text-left text-sm text-gray-600">לא קיבלת קוד?</Text>
            <Pressable onPress={() => void resendOtp()} disabled={!canResend || isResending}>
              <Text
                className={`text-left text-sm font-medium ${
                  canResend && !isResending ? 'text-purple-500' : 'text-gray-400'
                }`}>
                {isResending
                  ? 'שולח...'
                  : canResend
                    ? 'שלח שוב'
                    : `שלח שוב - ${formatTime(countdown)}`}
              </Text>
            </Pressable>
          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { OtpInput } from 'react-native-otp-entry';

interface OtpVerificationProps {
  phone: string;
  providedName?: string;
  onVerified: (needsName: boolean) => void;
  onBack: () => void;
}

export default function OtpVerification({
  phone,
  providedName,
  onVerified,
  onBack,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Start countdown timer
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

    // Show content animation
    setTimeout(() => setShowContent(true), 300);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const displayPhone = (e164: string) => {
    let phone = e164;
    if (phone.startsWith('+972')) {
      phone = phone.replace('+972', '0');
    }
    return phone;
  };

  const checkProfileExists = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error checking profile:', error);
        return false;
      }

      // Return true if profile exists with full_name, false if not
      return data && data.full_name && data.full_name.trim().length > 0;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  };

  const verifyOtp = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp;

    if (codeToVerify.length !== 6) {
      return; // Don't show error, just don't verify if not 6 digits
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: codeToVerify,
        type: 'sms',
      });

      if (error) {
        setErrorMessage('האימות נכשל: הקוד לא נכון');
      } else if (data.session && data.user) {
        // If name was provided in phone step, create profile immediately
        if (providedName) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                full_name: providedName.trim(),
                phone: phone,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (profileError) {
              console.error('Error creating profile:', profileError);
              // If profile creation fails, still proceed to name step
              onVerified(true);
            } else {
              // Profile created successfully, no need for name step
              onVerified(false);
            }
          } catch (error) {
            console.error('Error creating profile:', error);
            onVerified(true);
          }
        } else {
          // Check if user profile exists with full name
          const hasCompleteProfile = await checkProfileExists(data.user.id);

          // If profile doesn't exist or doesn't have full_name, need name step
          onVerified(!hasCompleteProfile);
        }
      }
    } catch (error) {
      setErrorMessage('נכשל באימות הקוד');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsResending(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        setErrorMessage('שליחת קוד נכשלה');
      } else {
        setCountdown(300);
        setCanResend(false);
        setOtp('');

        // Restart countdown
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
    } catch (error) {
      setErrorMessage('נכשל בשליחת קוד אימות שוב');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-gray-50">
      <View className="flex-1 px-6" style={{ direction: 'ltr', justifyContent: 'space-between' }}>
        {/* Top Section */}
        <View>
          {/* Back Button */}
          <View className="pb-4 pt-12">
            <Pressable className="h-10 w-10 items-center justify-center" onPress={onBack}>
              <Text className="text-2xl text-gray-700">←</Text>
            </Pressable>
          </View>

          {/* Header */}
          <View className="mb-8 mt-8 items-center">
            <Text className="mb-3 text-2xl font-semibold text-gray-900">שלחנו לך SMS</Text>
            <View className="flex-row items-center">
              <Text className="text-base text-gray-600">הכנס את קוד האימות ששלחנו אל</Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Text className="text-base font-medium text-gray-900">{displayPhone(phone)}</Text>
              <Pressable className="ml-2" onPress={onBack}>
                <Text className="text-base text-blue-500">✎</Text>
              </Pressable>
            </View>
          </View>

          {/* OTP Input */}
          <View className="mb-8 ">
            <OtpInput
              numberOfDigits={6}
              focusColor="#8B5CF6"
              focusStickBlinkingDuration={500}
              onTextChange={(text) => {
                setOtp(text);
              }}
              onFilled={(text) => {
                verifyOtp(text);
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

        {/* Bottom Section */}
        <View>
          {/* Error Message */}
          {errorMessage && (
            <View className="mb-4 px-4">
              <Text className="text-center text-sm text-red-500">{errorMessage}</Text>
            </View>
          )}

          {/* Verify Button */}
          <View className="mb-6 px-2">
            <Pressable
              className={`rounded-2xl py-4 ${
                otp.length === 6 && !loading ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
              onPress={verifyOtp}
              disabled={otp.length < 6 || loading}
              style={{
                shadowColor: otp.length === 6 && !loading ? '#8B5CF6' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}>
              <View className="flex-row items-center justify-center">
                {loading && <ActivityIndicator size="small" color="white" className="mr-2" />}
                <Text className="text-lg font-semibold text-white">
                  {loading ? 'מאמת...' : 'אמת'}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Resend Section */}
          <View className="items-center pb-8">
            <Text className="mb-2 text-sm text-gray-600">לא קיבלת קוד?</Text>
            <Pressable onPress={resendOtp} disabled={!canResend || isResending}>
              <Text
                className={`text-sm font-medium ${
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
  );
}

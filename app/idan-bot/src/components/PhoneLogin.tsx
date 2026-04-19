import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import OtpVerification from '@/components/OtpVerification';
import PhoneInput from '@/components/PhoneInput';

export default function PhoneLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleOtpSent = (phone: string) => {
    setPhoneNumber(phone);
    setStep('otp');
  };

  const handleBack = () => {
    setStep('phone');
  };

  return (
    <View className="flex-1 bg-gray-50">
      {step === 'phone' && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          exiting={FadeOutUp.duration(300)}
          style={styles.flex}>
          <PhoneInput onOtpSent={handleOtpSent} />
        </Animated.View>
      )}

      {step === 'otp' && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          exiting={FadeOutUp.duration(300)}
          style={styles.flex}>
          <OtpVerification phone={phoneNumber} onBack={handleBack} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

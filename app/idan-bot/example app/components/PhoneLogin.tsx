import React, { useState } from 'react';
import { View } from 'react-native';
import OtpVerification from './OtpVerification';
import PhoneInput from './PhoneInput';
import NameInput from './NameInput';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface PhoneLoginProps {
  onLoginSuccess: () => void;
}

export default function PhoneLogin({ onLoginSuccess }: PhoneLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [providedName, setProvidedName] = useState('');

  const handleOtpSent = (data: string) => {
    // Check if name data is included
    if (data.includes('|')) {
      const [phone, name] = data.split('|');
      setPhoneNumber(phone);
      setProvidedName(name);
    } else {
      setPhoneNumber(data);
      setProvidedName('');
    }
    setStep('otp');
  };

  const handleVerified = (needsName: boolean) => {
    if (needsName) {
      setStep('name');
    } else {
      onLoginSuccess();
    }
  };

  const handleNameCompleted = () => {
    onLoginSuccess();
  };

  const handleBack = () => {
    if (step === 'name') {
      setStep('otp');
    } else {
      setStep('phone');
      setPhoneNumber('');
    }
  };

  return (
    <View className="flex-1 bg-white">
      {step === 'phone' && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          exiting={FadeOutUp.duration(300)}
          className="flex-1">
          <PhoneInput onOtpSent={handleOtpSent} />
        </Animated.View>
      )}

      {step === 'otp' && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          exiting={FadeOutUp.duration(300)}
          className="flex-1">
          <OtpVerification
            phone={phoneNumber}
            providedName={providedName}
            onVerified={handleVerified}
            onBack={handleBack}
          />
        </Animated.View>
      )}

      {step === 'name' && (
        <Animated.View entering={FadeInDown.duration(400)} className="flex-1">
          <NameInput phone={phoneNumber} onCompleted={handleNameCompleted} onBack={handleBack} />
        </Animated.View>
      )}
    </View>
  );
}

import { View, Text } from 'react-native';
import React from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/hooks/useAuthRequired';

const WelcomeSection = () => {
  const { user } = useAuth();
  const { requireAuth } = useAuthRequired();

  const handleBookAppointment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requireAuth(() => {
      router.push('/(modal)/customer-book-appointment');
    });
  };

  return (
    <View style={{ direction: 'rtl' }} className="items-center justify-center gap-2">
      <Text className="text-right text-xl">
        <Text className="text-center text-xl font-bold">
          היי {user?.full_name ? user.full_name.split(' ')[0] : 'לקוח יקר'},{' '}
        </Text>
        יום טוב 👋🏻
      </Text>
      <Button title="לקביעת תור" onPress={handleBookAppointment} />
    </View>
  );
};

export default WelcomeSection;

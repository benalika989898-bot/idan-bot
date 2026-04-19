import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PhoneLogin from '@/components/PhoneLogin';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { session, user, loading } = useAuth();
  const isCrewOrAdmin = user?.role === 'crew' || user?.role === 'admin';

  React.useEffect(() => {
    if (loading || !session || !user) return;
    router.replace(isCrewOrAdmin ? '/(crew)/dashboard' : '/');
  }, [isCrewOrAdmin, loading, session, user]);

  return (
    <View style={styles.container}>
      <PhoneLogin onLoginSuccess={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

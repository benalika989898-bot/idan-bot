import HomeScreen from '@/screens/home/HomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function IndexScreen() {
  const { session, user, loading } = useAuth();

  const isAuthenticated = !!session;
  const isCrewOrAdmin = user && (user.role === 'crew' || user.role === 'admin');

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && isCrewOrAdmin) {
      router.replace('/(crew)/dashboard');
    }
  }, [isAuthenticated, isCrewOrAdmin, loading]);

  // Show blank while auth is loading or while we're about to redirect crew/admin
  if (loading || (isAuthenticated && isCrewOrAdmin)) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-white" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}

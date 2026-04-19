import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export function useAuthRequired() {
  const { session, user } = useAuth();

  const requireAuth = (callback?: () => void) => {
    if (!session || !user) {
      // Navigate to login screen
      router.push('/login');
      return false;
    }
    
    // User is authenticated, execute callback if provided
    if (callback) {
      callback();
    }
    return true;
  };

  return {
    isAuthenticated: !!session && !!user,
    requireAuth,
  };
}
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { StartupSplashProvider, useStartupSplash } from '@/contexts/StartupSplashContext';
import { fetchActiveCrewMembers } from '@/services/crew/members';
import { Heebo_400Regular, useFonts } from '@expo-google-fonts/heebo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';
import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated';
import { PortalHost, PortalProvider } from 'react-native-teleport';
import { Toaster } from 'sonner-native';
import PushNotificationSetup from '../components/PushNotificationSetup';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FabProvider } from '../contexts/FabContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import '../global.css';
import BlockedUserScreen from '../screens/BlockedUserScreen';
const queryClient = new QueryClient();

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

function ProtectedLayout() {
  const { session, user, loading } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    queryClient.prefetchQuery({
      queryKey: ['activeCrewMembers'],
      queryFn: async () => {
        const { data, error } = await fetchActiveCrewMembers();
        if (error) throw error;
        return data || [];
      },
    });
  }, [user?.id, user?.role]);

  if (loading) {
    return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'white' }]} />;
  }

  const isAuthenticated = !!session;
  const isCrewOrAdmin = user ? user.role === 'crew' || user.role === 'admin' : false;

  if (isAuthenticated && user?.is_blocked) {
    return <BlockedUserScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={isAuthenticated && isCrewOrAdmin ? '(crew)' : 'index'}>
      {/* Crew routes - accessible when authenticated crew/admin */}
      <Stack.Protected guard={isAuthenticated && isCrewOrAdmin}>
        <Stack.Screen
          name="(crew)"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>

      {/* Customer home - always accessible (redirect component handles crew routing) */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: 'white' },
          animationTypeForReplace: 'pop',
        }}
      />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen
          name="edit-profile"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack.Protected>

      {/* Product details - accessible to all users */}
      <Stack.Screen
        name="product-details"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      {/* Modal routes - accessible when authenticated or will redirect to login */}
      <Stack.Screen
        name="(modal)"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="fullscreen-block"
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

function AppContentInner({ appReady }: { appReady: boolean }) {
  const { loading, session, user } = useAuth();
  const { dashboardReady, setDashboardReady, startupCompleted, setStartupCompleted } =
    useStartupSplash();
  const [postSplashReady, setPostSplashReady] = useState(false);
  const isCrewOrAdmin = user ? user.role === 'crew' || user.role === 'admin' : false;
  const sessionUserId = session?.user?.id;
  const sawUnauthenticatedResolvedRef = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!loading && !sessionUserId) {
      sawUnauthenticatedResolvedRef.current = true;
    }
  }, [loading, sessionUserId]);

  useEffect(() => {
    if (!loading && !!sessionUserId && sawUnauthenticatedResolvedRef.current && !startupCompleted) {
      setDashboardReady(true);
      setStartupCompleted(true);
    }
  }, [loading, sessionUserId, setDashboardReady, setStartupCompleted, startupCompleted]);

  useEffect(() => {
    if (startupCompleted) return;

    if (loading) {
      setDashboardReady(false);
      return;
    }

    if (!sessionUserId || !isCrewOrAdmin) {
      setDashboardReady(true);
      return;
    }

    setDashboardReady(false);
  }, [isCrewOrAdmin, loading, sessionUserId, setDashboardReady, startupCompleted, user?.id]);

  const splashReady =
    startupCompleted || (appReady && !loading && (!isCrewOrAdmin || dashboardReady));

  useEffect(() => {
    if (!splashReady || loading) {
      setPostSplashReady(false);
      return;
    }

    const timeout = setTimeout(() => {
      setPostSplashReady(true);
    }, 350);

    return () => clearTimeout(timeout);
  }, [loading, splashReady]);

  return (
    <PortalProvider>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <ProtectedLayout />
      </View>
      {!startupCompleted ? (
        <AnimatedSplashOverlay
          ready={splashReady}
          onHidden={() => {
            setStartupCompleted(true);
          }}
        />
      ) : null}
      <PushNotificationSetup enabled={postSplashReady} />
      <PortalHost name="overlay" style={[StyleSheet.absoluteFillObject, { direction: 'ltr' }]} />
    </PortalProvider>
  );
}

function AppContent({ appReady }: { appReady: boolean }) {
  return (
    <StartupSplashProvider>
      <AppContentInner appReady={appReady} />
    </StartupSplashProvider>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
  });

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <KeyboardProvider>
              <FabProvider>
                <AppContent appReady={fontsLoaded} />
                <Toaster
                  toastOptions={{
                    titleStyle: { textAlign: 'left' },
                  }}
                  duration={1000}
                />
              </FabProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SettingsProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

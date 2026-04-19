import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import "../../global.css";
import "react-native-gesture-handler";
import "@/lib/nativewind-interop";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Toaster } from "sonner-native";

function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#111111" />
      </View>
    );
  }

  const isAuthenticated = Boolean(session);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={isAuthenticated ? "(tabs)" : "login"}
    >
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            animation: "none",
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: "none",
          }}
        />
        <Stack.Screen
          name="campaign-modal"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AnimatedSplashOverlay />
              <ProtectedLayout />
              <Toaster
                toastOptions={{
                  titleStyle: { textAlign: "left" },
                }}
                duration={1600}
              />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});

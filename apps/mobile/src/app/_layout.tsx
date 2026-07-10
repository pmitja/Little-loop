import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { CLERK_PUBLISHABLE_KEY, clerkEnabled } from '@/lib/auth';
import { setTokenGetter } from '@/lib/api';
import { syncCurrentUser } from '@/lib/userSync';
import { configurePurchases } from '@/lib/purchases';
import { initMonitoring } from '@/lib/monitoring';
import { queryClient } from '@/lib/query';
import { useLockStore } from '@/stores/lockStore';
// Load every persisted store at startup so the splash hydration gate can resolve.
import '@/stores/playlistStore';
import '@/stores/timerStore';

SplashScreen.preventAutoHideAsync();
initMonitoring();

/** Bridges Clerk's getToken into the non-hook API client + RevenueCat logIn. */
function ApiTokenBridge() {
  const { getToken, userId } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  useEffect(() => {
    if (!userId) return;
    syncCurrentUser().catch((error) => {
      console.warn('Failed to sync signed-in user with the API', error);
    });
  }, [userId]);
  useEffect(() => {
    // logIn ties the RevenueCat app-user-id to our Clerk user (PLAN §12).
    configurePurchases(userId).catch(() => {});
  }, [userId]);
  return null;
}

function AppStack() {
  // Navigator swap per PLAN §10: while child mode is active the parent/auth
  // routes are unmounted entirely — there is no back stack out of (child).
  const childModeActive = useLockStore((s) => s.childMode.active);
  return (
    <>
      <StatusBar style={childModeActive ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF9F1' } }}>
        <Stack.Screen name="index" />
        {/* The profile picker is part of the kid-safe flow, so it remains
            reachable while child mode keeps every parent route unmounted. */}
        <Stack.Screen name="whos-watching" options={{ gestureEnabled: false }} />
        <Stack.Protected guard={!childModeActive}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="gallery" />
        </Stack.Protected>
        <Stack.Protected guard={childModeActive}>
          <Stack.Screen name="(child)" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Screen
          name="pin-unlock"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Our animated splash route (s01) takes over from the native splash.
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppStack />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );

  if (!clerkEnabled) return app;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ApiTokenBridge />
      {app}
    </ClerkProvider>
  );
}

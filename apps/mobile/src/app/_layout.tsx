import { useEffect, useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
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
import { CLERK_PUBLISHABLE_KEY, clerkEnabled, useAuthStatus } from '@/lib/auth';
import { setTokenGetter } from '@/lib/api';
import { syncCurrentUser } from '@/lib/userSync';
import { configurePurchases } from '@/lib/purchases';
import { initMonitoring } from '@/lib/monitoring';
import { queryClient } from '@/lib/query';
import { useStoresHydrated } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { AppDialogHost } from '@/components';
import { useTimerStore } from '@/stores/timerStore';
import { syncCompletedWatchSessions } from '@/features/family/watchSessionSync';
// Load every persisted store at startup so the splash hydration gate can resolve.
import '@/stores/playlistStore';

SplashScreen.preventAutoHideAsync();
initMonitoring();

const SHARE_INTENT_OPTIONS = { resetOnBackground: false } as const;

/** Bridges Clerk's getToken into the non-hook API client + RevenueCat logIn. */
function ApiTokenBridge() {
  const { getToken, userId } = useAuth();
  // Install the token getter before descendant passive effects can make an API
  // request (notably a cold launch from the system share sheet).
  useLayoutEffect(() => {
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

function WatchSessionBridge() {
  const { isSignedIn } = useAuthStatus();
  useEffect(() => {
    if (!isSignedIn) return;
    const sync = () => {
      void syncCompletedWatchSessions(useTimerStore.getState().sessions).catch(() => {});
    };
    sync();
    return useTimerStore.subscribe((state, previous) => {
      if (state.sessions !== previous.sessions) sync();
    });
  }, [isSignedIn]);
  return null;
}

function AppStack() {
  // Navigator swap per PLAN §10: while child mode is active the parent/auth
  // routes are unmounted entirely — there is no back stack out of (child).
  const childModeActive = useLockStore((s) => s.childMode.active);
  const storesHydrated = useStoresHydrated();
  const { isLoaded, isSignedIn } = useAuthStatus();
  const signedInChildModeActive = isSignedIn && childModeActive;
  const router = useRouter();
  const pathname = usePathname();
  const { hasShareIntent } = useShareIntentContext();
  const routedShareIntent = useRef(false);

  // Android delivers the share as an intent, not a URL, so nothing navigates on
  // its own (iOS gets there through +native-intent). Every share goes through
  // the PIN bridge, including a cold launch that restores into Child Mode.
  useEffect(() => {
    // iOS navigation is already handled synchronously by +native-intent.
    // Running this listener there can race the initial route and stack a
    // second PIN modal before /pin-unlock becomes the current pathname.
    if (Platform.OS !== 'android') return;
    if (!hasShareIntent) {
      routedShareIntent.current = false;
      return;
    }
    if (
      routedShareIntent.current ||
      !storesHydrated ||
      !isLoaded ||
      !isSignedIn
    ) {
      return;
    }

    // iOS already arrived here through +native-intent. Mark it handled so the
    // provider becoming ready cannot stack a second PIN screen on top.
    if (pathname === '/pin-unlock' || pathname === '/share-video') {
      routedShareIntent.current = true;
      return;
    }

    routedShareIntent.current = true;
    router.push({ pathname: '/pin-unlock', params: { next: '/share-video' } });
  }, [hasShareIntent, storesHydrated, isLoaded, isSignedIn, pathname, router]);

  return (
    <>
      <StatusBar style={signedInChildModeActive ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF9F1' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="accept-invite" />
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn}>
          {/* These are the only signed-in bridge routes shared by parent and
              child mode: profile switching and the PIN-protected parent exit. */}
          <Stack.Screen name="whos-watching" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="pin-unlock"
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && !signedInChildModeActive}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="gallery" />
          <Stack.Screen name="share-video" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedInChildModeActive}>
          <Stack.Screen name="(child)" options={{ gestureEnabled: false }} />
        </Stack.Protected>
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
    <ShareIntentProvider options={SHARE_INTENT_OPTIONS}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppStack />
          <WatchSessionBridge />
          <AppDialogHost />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );

  if (!clerkEnabled) return app;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ApiTokenBridge />
      {app}
    </ClerkProvider>
  );
}

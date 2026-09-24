import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { StatusBar } from 'expo-status-bar';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
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
import { authConfigured, useAuthStatus } from '@/lib/auth';
import { authClient, getSessionCookie } from '@/lib/authClient';
import { setCookieGetter } from '@/lib/api';
import { syncCurrentUser } from '@/lib/userSync';
import { configurePurchases } from '@/lib/purchases';
import { initAttribution, logSignUp, setAttributionUser } from '@/lib/attribution';
import { initMonitoring } from '@/lib/monitoring';
import { queryClient } from '@/lib/query';
import { useAppStore, useStoresHydrated } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { AppDialogHost } from '@/components';
import { useTimerStore } from '@/stores/timerStore';
import {
  openActiveWatchSession,
  syncCompletedWatchSessions,
} from '@/features/family/watchSessionSync';
// Load every persisted store at startup so the splash hydration gate can resolve.
import '@/stores/playlistStore';
import '@/stores/requestStore';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { syncKidStateIfStale } from '@/features/kid/kidSync';

SplashScreen.preventAutoHideAsync();
initMonitoring();

const SHARE_INTENT_OPTIONS = { resetOnBackground: false } as const;

/** Bridges the better-auth session cookie into the non-hook API client + RevenueCat logIn. */
function ApiSessionBridge() {
  const { data } = authClient.useSession();
  const userId = data?.user?.id ?? null;
  // Install the cookie getter before descendant passive effects can make an API
  // request (notably a cold launch from the system share sheet). getCookie reads
  // synchronously from SecureStore's cache, so no dependency churn is needed.
  useLayoutEffect(() => {
    setCookieGetter(getSessionCookie);
  }, []);
  useEffect(() => {
    if (!userId) return;
    syncCurrentUser().catch((error) => {
      console.warn('Failed to sync signed-in user with the API', error);
    });
  }, [userId]);
  useEffect(() => {
    // logIn ties the RevenueCat app-user-id to our better-auth user (PLAN §12).
    configurePurchases(userId).catch(() => {});
  }, [userId]);
  useEffect(() => {
    // Meta ad attribution: the signed-in id joins conversions across devices,
    // and the first sign-in on an install is the registration conversion.
    setAttributionUser(userId);
    if (userId) void logSignUp().catch(() => {});
  }, [userId]);
  return null;
}

function WatchSessionBridge() {
  const { isSignedIn } = useAuthStatus();
  const kidDevice = useKidDeviceStore((s) => s.paired);
  useEffect(() => {
    if (!isSignedIn && !kidDevice) return;
    const sync = () => {
      void syncCompletedWatchSessions(useTimerStore.getState().sessions).catch(() => {});
    };
    const openActive = () => {
      // Kid devices report through their own heartbeat (KidDeviceBridge).
      if (kidDevice) return;
      const { sessions, activeSessionId } = useTimerStore.getState();
      const active = sessions.find((session) => session.id === activeSessionId);
      if (active) void openActiveWatchSession(active);
    };
    sync();
    openActive();
    return useTimerStore.subscribe((state, previous) => {
      if (state.sessions !== previous.sessions) sync();
      if (state.activeSessionId !== previous.activeSessionId) openActive();
    });
  }, [isSignedIn, kidDevice]);
  return null;
}

/**
 * Kid-device sync budget. Nothing is polled while a video plays or while the
 * app is closed; watch time is reported once per viewing stretch, not live.
 */
const KID_SYNC_ON_FOREGROUND_MS = 30_000;
const KID_SYNC_AFTER_VIDEO_MS = 2 * 60_000;
const KID_SYNC_IDLE_MS = 5 * 60_000;

/**
 * Keeps a child's own device in step with the parent's phone for the price of
 * a few requests an hour: it syncs on launch and foreground, after leaving the
 * player, and at most every 5 minutes otherwise. Going to the background
 * closes the viewing stretch, which WatchSessionBridge reports in one write.
 */
function KidDeviceBridge() {
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const pathname = usePathname();
  const playing = pathname.endsWith('/player');
  // A child waiting on "time's up" is exactly when a parent raises the limit.
  const idleMs = pathname.endsWith('/times-up') ? KID_SYNC_AFTER_VIDEO_MS : KID_SYNC_IDLE_MS;

  useEffect(() => {
    if (!kidDevice) return;
    const sync = (maxAgeMs: number) => void syncKidStateIfStale(maxAgeMs).catch(() => {});
    // The splash screen already synced on launch; this only catches a miss.
    sync(KID_SYNC_ON_FOREGROUND_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      const timer = useTimerStore.getState();
      if (state === 'active') {
        const childId = useAppStore.getState().activeChildProfileId;
        if (!timer.activeSessionId && childId) timer.startSession(childId);
        sync(KID_SYNC_ON_FOREGROUND_MS);
      } else if (state === 'background' && timer.activeSessionId) {
        timer.endSession('app_closed');
      }
    });
    return () => subscription.remove();
  }, [kidDevice]);

  // Leaving the player (or landing on "time's up") is a natural moment to
  // pick up new videos or a raised limit; the idle timer covers the rest.
  useEffect(() => {
    if (!kidDevice || playing) return;
    void syncKidStateIfStale(KID_SYNC_AFTER_VIDEO_MS).catch(() => {});
    const idle = setInterval(() => {
      if (AppState.currentState === 'active') {
        void syncKidStateIfStale(idleMs).catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(idle);
  }, [kidDevice, playing, idleMs]);

  return null;
}

function AppStack() {
  // Navigator swap per PLAN §10: while child mode is active the parent/auth
  // routes are unmounted entirely — there is no back stack out of (child).
  const childModeActive = useLockStore((s) => s.childMode.active);
  const storesHydrated = useStoresHydrated();
  const { isLoaded, isSignedIn } = useAuthStatus();
  // A paired kid device only ever mounts kid mode — no sign-in, no parent zone.
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const signedInChildModeActive = isSignedIn && childModeActive && !kidDevice;
  const parentZone = isSignedIn && !kidDevice;
  const router = useRouter();
  const pathname = usePathname();
  const { isTablet } = useResponsiveLayout();
  useEffect(() => {
    if (isTablet) {
      void ScreenOrientation.unlockAsync().catch(() => {});
    } else if (pathname !== '/player' && !pathname.endsWith('/player')) {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, [isTablet, pathname]);
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
      <StatusBar style={signedInChildModeActive || kidDevice ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF9F1' } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!kidDevice}>
          <Stack.Screen name="accept-invite" />
          <Stack.Screen name="kid-setup" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn && !kidDevice}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={parentZone}>
          {/* These are the only signed-in bridge routes shared by parent and
              child mode: profile switching and the PIN-protected parent exit. */}
          <Stack.Screen name="whos-watching" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen
            name="pin-unlock"
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={parentZone && !signedInChildModeActive}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="gallery" />
          <Stack.Screen
            name="share-video"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedInChildModeActive || kidDevice}>
          <Stack.Screen name="(child)" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={kidDevice}>
          <Stack.Screen
            name="kid-sign-out"
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
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
    if (!fontsLoaded) return;

    // Our animated splash route (s01) takes over from the native splash. Every
    // ATT attempt waits for this promise, while later foreground transitions
    // give iOS another chance if it discarded a request as `undetermined`.
    const splashHidden = SplashScreen.hideAsync();
    const initialize = () => {
      // A child's own device never shows the tracking prompt or reports ads.
      const kid = useKidDeviceStore.getState();
      if (kid.paired || kid.setupMode) return;
      void splashHidden.then(initAttribution).catch(() => {});
    };

    initialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') initialize();
    });
    return () => subscription.remove();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const app = (
    <ShareIntentProvider options={SHARE_INTENT_OPTIONS}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppStack />
          <WatchSessionBridge />
          <KidDeviceBridge />
          <AppDialogHost />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );

  if (!authConfigured) return app;

  // better-auth's client is a standalone singleton — no provider to mount, just
  // the bridge that wires its session into the API client and RevenueCat.
  return (
    <>
      <ApiSessionBridge />
      {app}
    </>
  );
}

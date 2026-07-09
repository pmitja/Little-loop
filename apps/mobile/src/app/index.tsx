import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Logo } from '@/components/Logo';
import { ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore, useStoresHydrated } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';
import { useAuthStatus } from '@/lib/auth';

function PulsingDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0.25);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.25, { duration: 600 })),
        -1,
      ),
    );
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** s01 — splash: brand + pulsing dots while stores/auth hydrate, then redirect. */
export default function Splash() {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const { isLoaded, isSignedIn } = useAuthStatus();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const pinSet = useLockStore((s) => s.pinSet);
  const childModeActive = useLockStore((s) => s.childMode.active);

  useEffect(() => {
    if (!hydrated || !isLoaded) return;
    // Close any session left open by an app kill before anything can start a new one.
    useTimerStore.getState().reconcile();
    // Give the splash one beat so first launch doesn't flash past the brand.
    const t = setTimeout(() => {
      if (childModeActive) {
        // Killed during child mode → restore into child mode, never flash parent UI.
        router.replace('/(child)');
      } else if (!onboardingComplete) {
        router.replace('/(onboarding)/welcome');
      } else if (!isSignedIn) {
        router.replace('/(auth)/sign-up');
      } else if (!pinSet) {
        router.replace('/(onboarding)/pin-setup');
      } else {
        // Always start on s21 (profile picker) / s21b (empty state).
        // Parent dashboard is only reachable through the PIN gate.
        router.replace('/whos-watching');
      }
    }, 700);
    return () => clearTimeout(t);
  }, [hydrated, isLoaded, isSignedIn, onboardingComplete, pinSet, childModeActive, router]);

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Logo size={96} />
        <View style={styles.titles}>
          <Txt weight="black" size={34} style={{ letterSpacing: -0.34 }}>
            LittleLoop
          </Txt>
          <Txt weight="bold" size={15} color={colors.muted}>
            Parent-approved videos only
          </Txt>
        </View>
      </View>
      <View style={styles.dots}>
        <PulsingDot delay={0} />
        <PulsingDot delay={200} />
        <PulsingDot delay={400} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  titles: { alignItems: 'center', gap: 8 },
  dots: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary },
});

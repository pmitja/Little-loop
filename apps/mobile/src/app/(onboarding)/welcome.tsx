import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Button, Float, Txt } from '@/components';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';
import { springs } from '@/theme/motion';
import { useAppStore } from '@/stores/appStore';
import { authConfigured, useAuthStatus } from '@/lib/auth';

const PAGES = [
  {
    art: require('../../../assets/images/characters/welcome.png'),
    // Sampled from the artwork's own backdrop so the picture bleeds edge to edge.
    bg: '#FDE7D0',
    title: 'Only the videos you choose.',
    body: 'Pick a few videos and hand over the phone. Your child gets no search, no suggestions and no autoplay.',
    cta: 'Get started',
  },
  {
    art: require('../../../assets/images/characters/pin-safe.png'),
    bg: '#FDE6A2',
    title: 'A grown-up PIN keeps it that way.',
    body: 'Leaving Child Mode, adding videos and changing time limits all need your PIN.',
    cta: 'Next',
  },
  {
    art: require('../../../assets/images/characters/add-video.png'),
    bg: '#C4F3E1',
    title: 'Ready in three small steps.',
    body: 'Create your PIN, add your child, then choose their first video.',
    cta: 'Start setup',
  },
] as const;

const ART_ASPECT = 537 / 720;
const BACKDROPS = PAGES.map((p) => p.bg);

/** First run: one idea per page over the art, a bottom sheet that carries the words. */
export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { isTablet } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const progress = useSharedValue(0);
  const { isSignedIn } = useAuthStatus();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  useEffect(() => {
    progress.value = withSpring(page, springs.gentle);
  }, [page, progress]);

  const finish = () => {
    setOnboardingComplete(true);
    router.replace(authConfigured && !isSignedIn ? '/(auth)/sign-up' : '/(onboarding)/pin-setup');
  };

  const signIn = () => {
    setOnboardingComplete(true);
    router.replace(authConfigured ? '/(auth)/sign-in' : '/(onboarding)/pin-setup');
  };

  const isLast = page === PAGES.length - 1;
  const advance = () => (isLast ? finish() : setPage((p) => p + 1));
  const swipeTo = (delta: number) => setPage((p) => Math.min(PAGES.length - 1, Math.max(0, p + delta)));

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) scheduleOnRN(swipeTo, event.translationX < 0 ? 1 : -1);
    });

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1, 2], BACKDROPS),
  }));

  const sheetWidth = isTablet ? Math.min(width, 620) : width;
  const artWidth = Math.min(width, isTablet ? 620 : width, (height * 0.46) / ART_ASPECT);
  const current = PAGES[page];

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={[styles.root, bgStyle]}>
        <StatusBar style="dark" />
        <View style={[styles.artArea, { paddingTop: insets.top + 24 }]}>
          <Animated.View key={page} entering={FadeIn.duration(360)} exiting={FadeOut.duration(200)}>
            <Float distance={8} sway={1} duration={2800}>
              <Image source={current.art} style={{ width: artWidth, height: artWidth * ART_ASPECT }} contentFit="cover" accessible={false} />
            </Float>
          </Animated.View>
        </View>
        <View style={[styles.sheet, { width: sheetWidth, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Page ${i + 1}`} hitSlop={8} onPress={() => setPage(i)}>
                <Dot active={i === page} />
              </Pressable>
            ))}
          </View>
          <Animated.View key={`copy-${page}`} entering={FadeInDown.springify().damping(20).stiffness(170)} style={styles.copy}>
            <Txt weight="black" size={30} lineHeight={35} color={colors.parent.night}>
              {current.title}
            </Txt>
            <Txt weight="bold" size={15.5} lineHeight={23} color={colors.parent.muted}>
              {current.body}
            </Txt>
          </Animated.View>
          <Button title={current.cta} onPress={advance} style={styles.cta} />
          {!isSignedIn ? (
            <Pressable onPress={signIn} hitSlop={8} style={styles.signIn}>
              <Txt weight="extrabold" size={14} color={colors.parent.muted} center>
                I already have an account
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 24 : 8);
  useEffect(() => {
    w.value = withSpring(active ? 24 : 8, springs.snappy);
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: active ? colors.parent.night : colors.dotInactive }, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  artArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 30,
    paddingHorizontal: 28,
    gap: 14,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  copy: { gap: 10, minHeight: 140 },
  cta: { marginTop: 8 },
  signIn: { paddingVertical: 6 },
});

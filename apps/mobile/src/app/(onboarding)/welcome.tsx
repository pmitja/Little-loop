import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryIllustration, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { clerkEnabled, useAuthStatus } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGES = [
  {
    art: 'welcome',
    title: 'You choose every video.',
    body: 'Your child gets one calm screen with only the videos you approve.',
    cta: 'Show me how',
  },
  {
    art: 'pin-safe',
    title: 'Ready in three small steps.',
    body: 'Create a parent PIN, add your child, then choose their first video.',
    cta: 'Start setup',
  },
] as const;

/** Onboarding promise pager (concept §09): sky gradient, mascot circle, one idea per page. */
export default function Welcome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { isSignedIn } = useAuthStatus();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const finish = () => {
    setOnboardingComplete(true);
    router.replace(clerkEnabled && !isSignedIn ? '/(auth)/sign-up' : '/(onboarding)/pin-setup');
  };

  const signIn = () => {
    setOnboardingComplete(true);
    router.replace(clerkEnabled ? '/(auth)/sign-in' : '/(onboarding)/pin-setup');
  };

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const isLast = page === PAGES.length - 1;

  return (
    <LinearGradient colors={[colors.child.sky, '#A5E1EF']} style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1, marginTop: insets.top }}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <StoryIllustration scene={p.art} width={Math.min(width - 48, 320)} style={styles.mascotStage} />
            <Txt weight="black" size={26} color={colors.parent.night} center lineHeight={31} style={styles.title}>
              {p.title}
            </Txt>
            <Txt weight="semibold" size={14.5} color="#2E5566" center lineHeight={21.75} style={styles.body}>
              {p.body}
            </Txt>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dotBase, i === page ? styles.dotActive : styles.dotIdle]}
          />
        ))}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 22 }]}>
        <Pressable
          onPress={() => (isLast ? finish() : goTo(page + 1))}
          style={({ pressed }) => [styles.cta, shadows.coralButton, pressed && { opacity: 0.9 }]}
        >
          <Txt weight="black" size={16} color="#fff">{PAGES[page].cta}</Txt>
        </Pressable>
        {!isSignedIn ? (
          <Pressable onPress={signIn} hitSlop={8}>
            <Txt weight="bold" size={13} color="#2E5566" center>
              I already have an account
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 16 },
  mascotStage: { marginBottom: 12, borderRadius: 32 },
  title: { maxWidth: 280 },
  body: { maxWidth: 280 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 20 },
  dotBase: { height: 8, borderRadius: 4 },
  dotIdle: { width: 8, backgroundColor: 'rgba(42,59,92,.25)' },
  dotActive: { width: 22, backgroundColor: colors.parent.night },
  footer: { paddingHorizontal: 24, gap: 16, alignItems: 'center' },
  cta: {
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: colors.child.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

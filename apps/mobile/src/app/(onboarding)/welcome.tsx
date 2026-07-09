import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { clerkEnabled } from '@/lib/auth';
import {
  ChildModeIllustration,
  NoBrowsingIllustration,
  PlaylistIllustration,
} from '@/features/onboarding/illustrations';

const PAGES = [
  {
    illustration: <PlaylistIllustration />,
    title: 'Parent-approved videos only',
    body: 'Create a playlist your child can watch safely — without search, recommendations, or endless scrolling.',
    cta: 'Get Started',
  },
  {
    illustration: <NoBrowsingIllustration />,
    title: 'No browsing. No surprises.',
    body: 'Children can only watch videos you add. They cannot open related videos, channels, or search results.',
    cta: 'Continue',
  },
  {
    illustration: <ChildModeIllustration />,
    title: 'Simple child mode',
    body: 'A calm, distraction-free player designed for young children.',
    cta: 'Create Parent PIN',
  },
] as const;

/** s02–s04 — onboarding pager with Skip, dots, and per-page CTA. */
export default function Welcome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const finish = () => {
    setOnboardingComplete(true);
    router.replace(clerkEnabled ? '/(auth)/sign-up' : '/(onboarding)/pin-setup');
  };

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const isLast = page === PAGES.length - 1;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.skipRow}>
        <Pressable onPress={() => (isLast ? finish() : goTo(PAGES.length - 1))} hitSlop={10}>
          <Txt weight="extrabold" size={14} color={colors.subtle} style={styles.skip}>
            Skip
          </Txt>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <View style={styles.illustration}>{p.illustration}</View>
            <View style={styles.copy}>
              <Txt weight="black" size={28} center lineHeight={33.5}>
                {p.title}
              </Txt>
              <Txt weight="semibold" size={15} color={colors.muted} center lineHeight={22.5}>
                {p.body}
              </Txt>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dotBase,
              i === page ? styles.dotActive : { backgroundColor: colors.dotInactive },
            ]}
          />
        ))}
      </View>
      <View style={styles.ctaWrap}>
        <Button title={PAGES[page].cta} onPress={() => (isLast ? finish() : goTo(page + 1))} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 14 },
  skip: { paddingVertical: 10, paddingHorizontal: 6 },
  pager: { flex: 1 },
  page: { flex: 1 },
  illustration: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 12, paddingHorizontal: 30 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginVertical: 22 },
  dotBase: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22, backgroundColor: colors.primary },
  ctaWrap: { paddingHorizontal: 24, paddingBottom: 20 },
});

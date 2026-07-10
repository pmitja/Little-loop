import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Txt, ScreenContainer } from '@/components';
import { colors } from '@/theme/tokens';
import { getPlans, purchasePlan, purchasesLive, restorePurchases, type Plan } from '@/lib/purchases';
import { usePremium } from '@/stores/entitlementStore';

const FEATURES = [
  'Unlimited videos per playlist',
  'Up to 4 child profiles',
  'Multiple playlists per child',
  'Everything in Free, forever',
];

function FeatureCheck({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Txt weight="black" size={13} color={colors.child.sun}>✓</Txt>
      <Txt weight="bold" size={13.5} color="#FFFFFF">
        {label}
      </Txt>
    </View>
  );
}

/** s19 — paywall: fully custom plan cards over the RevenueCat offering (PLAN §12). */
export default function Paywall() {
  const router = useRouter();
  const { trigger = 'settings', child = 'Your child' } = useLocalSearchParams<{ trigger?: 'playlist-cap' | 'profile-cap' | 'settings'; child?: string }>();
  const premium = usePremium();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan['id']>('yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlans()
      .then((p) => {
        if (!cancelled) setPlans(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Purchase (or restore) completed → nothing left to sell.
  useEffect(() => {
    if (premium) {
      const t = setTimeout(() => router.back(), 600);
      return () => clearTimeout(t);
    }
  }, [premium, router]);

  const selectedPlan = plans.find((p) => p.id === selected);

  const buy = async () => {
    if (!selectedPlan || busy) return;
    setBusy(true);
    const result = await purchasePlan(selectedPlan);
    setBusy(false);
    if (result === 'failed') {
      Alert.alert('Purchase failed', 'The store could not complete the purchase. Please try again.');
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const restored = await restorePurchases().catch(() => false);
    setBusy(false);
    Alert.alert(
      restored ? 'Purchases restored' : 'Nothing to restore',
      restored
        ? 'LittleLoop Premium is active on this device.'
        : 'No previous LittleLoop purchase was found for this store account.',
    );
  };

  const ctaTitle = premium ? 'Premium active' : 'Subscribe now';

  const context = trigger === 'playlist-cap' ? { pre: `${child}’s playlist is full — `, hl: '10 of 10 videos', post: ' on the free plan.' } : trigger === 'profile-cap' ? { pre: 'You’ve used ', hl: 'every free child profile', post: '.' } : null;
  return (
    <ScreenContainer mode="plum" style={styles.container}>
      <View style={styles.closeRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeCircle}>
          <Txt weight="extrabold" size={14} color="#FFFFFF">✕</Txt>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Txt size={44}>🦉</Txt>
        <Txt weight="black" size={24} color="#FFFFFF" center>LittleLoop Premium</Txt>
      </View>

      {context ? (
        <View style={styles.contextBanner}>
          <Txt weight="bold" size={12.5} color="#FFFFFF" center lineHeight={18}>
            {context.pre}
            <Txt weight="black" size={12.5} color={colors.child.sun}>{context.hl}</Txt>
            {context.post}
          </Txt>
        </View>
      ) : null}

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <FeatureCheck key={f} label={f} />
        ))}
      </View>

      <View style={styles.planRow}>
        {(['monthly', 'yearly'] as const).map((id) => {
          const plan = plans.find((p) => p.id === id);
          const isSelected = selected === id;
          return (
            <Pressable
              key={id}
              onPress={() => setSelected(id)}
              style={[styles.planCard, isSelected ? styles.planCardSelected : null]}
            >
              {id === 'yearly' ? (
                <View style={styles.saveBadge}>
                  <Txt weight="black" size={9.5} color="#4A3A20">SAVE 37%</Txt>
                </View>
              ) : null}
              <Txt weight="black" size={20} color={colors.parent.night}>
                {plan?.priceString ?? '—'}
              </Txt>
              <Txt weight="bold" size={11} color={colors.parent.muted}>
                {plan?.subline ?? (id === 'yearly' ? 'per year' : 'per month')}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={buy}
        disabled={premium || !selectedPlan || busy}
        style={({ pressed }) => [styles.cta, (premium || !selectedPlan) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
      >
        {busy ? (
          <ActivityIndicator color="#4A3A20" />
        ) : (
          <Txt weight="black" size={16} color="#4A3A20">
            {ctaTitle}
          </Txt>
        )}
      </Pressable>

      <View style={styles.linkRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} disabled={busy}>
          <Txt weight="extrabold" size={13.5} color="rgba(255,255,255,.8)">Not now</Txt>
        </Pressable>
        <Pressable onPress={restore} hitSlop={8} disabled={busy}>
          <Txt weight="extrabold" size={13.5} color="rgba(255,255,255,.8)">Restore purchase</Txt>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />
      <Txt weight="semibold" size={11} color="rgba(255,255,255,.6)" center lineHeight={16.5}>
        {purchasesLive
          ? 'Subscription renews automatically. Cancel anytime in App Store settings before renewal. Free plan: 1 child profile, 1 playlist, up to 10 approved videos.'
          : 'Store not configured — purchases are simulated in this build. Free plan: 1 child profile, 1 playlist, up to 10 approved videos.'}
      </Txt>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 12, paddingBottom: 14 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: 4, marginBottom: 14 },
  contextBanner: {
    backgroundColor: 'rgba(255,255,255,.14)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  features: {
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 9,
    marginBottom: 14,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  planCardSelected: {
    borderColor: colors.child.sun,
  },
  saveBadge: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    backgroundColor: colors.child.sun,
    borderRadius: 9,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  cta: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.child.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 },
});

import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button, ScreenContainer, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { getPlans, purchasePlan, purchasesLive, restorePurchases, type Plan } from '@/lib/purchases';
import { usePremium } from '@/stores/entitlementStore';

const FEATURES = [
  'Multiple child profiles',
  'Unlimited approved videos & playlists',
  'Time schedules & activity insights',
  'Cloud sync & playlist backup',
];

function FeatureCheck({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Svg width={9} height={7} viewBox="0 0 9 7">
          <Path
            d="M1 3.5 L3.2 5.7 L8 1"
            stroke={colors.greenDark}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
      <Txt weight="bold" size={14} color="#3D4A63">
        {label}
      </Txt>
    </View>
  );
}

/** s19 — paywall: fully custom plan cards over the RevenueCat offering (PLAN §12). */
export default function Paywall() {
  const router = useRouter();
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

  const ctaTitle = premium
    ? 'Premium active'
    : selectedPlan?.trialDays
      ? 'Start Free Trial'
      : 'Continue';

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.closeRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeCircle}>
          <Txt weight="extrabold" size={14} color={colors.subtle}>
            ✕
          </Txt>
        </Pressable>
      </View>

      <View style={styles.heroRow}>
        <LinearGradient
          colors={['#6FBBFB', '#4A9FF0']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.heroIcon}
        >
          <Svg width={34} height={34} viewBox="0 0 34 34">
            <Circle cx={17} cy={17} r={15} stroke="rgba(255,255,255,.95)" strokeWidth={3.5} fill="none" />
            <Path d="M14 11 L24 17 L14 23 Z" fill="#FFFFFF" />
          </Svg>
        </LinearGradient>
      </View>

      <Txt weight="black" size={25} center>
        More control for your family
      </Txt>
      <Txt weight="semibold" size={14} color={colors.muted} center lineHeight={21} style={styles.sub}>
        Create multiple child profiles, organize playlists, and keep settings synced across devices.
      </Txt>

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
                <View style={styles.bestValue}>
                  <Txt weight="extrabold" size={10.5} color="#FFFFFF">
                    BEST VALUE
                  </Txt>
                </View>
              ) : null}
              <Txt weight="extrabold" size={14} color={isSelected ? colors.primaryDark : colors.ink}>
                {id === 'yearly' ? 'Yearly' : 'Monthly'}
              </Txt>
              <Txt weight="black" size={20} style={{ marginTop: 6 }}>
                {plan?.priceString ?? '—'}
              </Txt>
              <Txt weight="semibold" size={11.5} color={isSelected ? colors.muted : colors.subtle}>
                {plan?.subline ?? ''}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={ctaTitle}
        onPress={buy}
        loading={busy}
        disabled={premium || !selectedPlan}
        style={{ marginTop: 18 }}
      />
      <Pressable onPress={restore} hitSlop={8} disabled={busy}>
        <Txt weight="extrabold" size={13.5} color={colors.primary} center style={{ marginTop: 13 }}>
          Restore Purchases
        </Txt>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Txt weight="semibold" size={11} color={colors.subtle} center lineHeight={16.5}>
        {purchasesLive
          ? '7-day free trial, then $34.99/year. Cancel anytime in App Store settings before renewal. Free plan: 1 child profile, 1 playlist, up to 10 approved videos.'
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
    backgroundColor: '#F0F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: { alignItems: 'center', marginTop: 2, marginBottom: 14 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primaryButton,
    shadowOpacity: 0.4,
  },
  sub: { marginTop: 8, marginBottom: 18 },
  features: { gap: 9, marginBottom: 18 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRow: { flexDirection: 'row', gap: 12 },
  planCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  planCardSelected: {
    backgroundColor: colors.primaryTint,
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  bestValue: {
    position: 'absolute',
    top: -11,
    right: 12,
    backgroundColor: colors.coral,
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 9,
    ...shadows.coralButton,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});

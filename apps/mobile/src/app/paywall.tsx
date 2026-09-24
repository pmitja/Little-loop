import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { FREE_LIMITS } from '@littleloop/shared';
import {
  AppDialogHost,
  AppIcon,
  Appear,
  Breathe,
  PopIn,
  PressableScale,
  showAppAlert,
  Txt,
  type AppIconName,
} from '@/components';
import { colors, exactType } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  getPlans,
  purchasePlan,
  purchasesLive,
  restorePurchases,
  yearlySavingsPercent,
  type Plan,
} from '@/lib/purchases';
import { usePremium } from '@/stores/entitlementStore';
import { useAppStore } from '@/stores/appStore';

const GREEN = '#3FA652';
const GREEN_DARK = '#287A4C';
const GREEN_TINT = '#C9EFD0';
const MINT = '#F1FAF3';

type Trigger = 'playlist-cap' | 'profile-cap' | 'channels' | 'kid-devices' | 'settings';

/**
 * Every row names something the free plan actually withholds — the `usePremium()`
 * gates in the app. PIN-locked child mode, daily limits, bedtime, school hours
 * and activity stay free, so they are not rows here.
 */
const ROWS: { icon: AppIconName; title: string; detail: string; free: string | null }[] = [
  { icon: 'videos', title: 'Unlimited videos', detail: 'In every playlist', free: `${FREE_LIMITS.videosPerPlaylist} videos` },
  { icon: 'channels', title: 'Whole channels', detail: 'New uploads still come to you first', free: null },
  { icon: 'profile', title: 'More child profiles', detail: 'One for each kid', free: `${FREE_LIMITS.childProfiles} profile` },
  { icon: 'parent-hq', title: 'Caregiver sharing', detail: 'Invite another grown-up', free: null },
  { icon: 'kid-device', title: 'More kid devices', detail: 'A child’s own phone or tablet', free: `${FREE_LIMITS.kidDevices} device` },
];

/** The small line above the title says why the paywall opened. */
function eyebrow(trigger: Trigger, child: string): string {
  switch (trigger) {
    case 'playlist-cap':
      return `${child}’s playlist is full`;
    case 'profile-cap':
      return 'Room for another child';
    case 'channels':
      return 'Approve whole channels';
    case 'kid-devices':
      return 'More kid devices';
    default:
      return 'LittleLoop Premium';
  }
}

function Tick() {
  return (
    <View style={styles.tick}>
      <Txt weight="black" size={13} color="#FFFFFF">✓</Txt>
    </View>
  );
}

function Cross() {
  return (
    <View style={styles.cross}>
      <Txt weight="black" size={11} color="#A59DA9">✕</Txt>
    </View>
  );
}

/** 19c (compare Free vs Premium) with 19d (choose a plan) as a sheet over it. */
export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // iPad: the plan picker is a centred card rather than a bottom sheet.
  const { isTablet } = useResponsiveLayout();
  const { trigger = 'settings', child = 'Your child' } = useLocalSearchParams<{ trigger?: Trigger; child?: string }>();
  const premium = usePremium();
  const canManageBilling = useAppStore((state) => state.familyRole !== 'caregiver');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan['id']>('yearly');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canManageBilling) return;
    let cancelled = false;
    getPlans()
      .then((p) => {
        if (!cancelled) setPlans(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canManageBilling]);

  /**
   * The paywall is reached both by push (settings, add-video) and by replace or
   * <Redirect> (add-child at the profile cap, a shared link over the limit). In the
   * replace cases there is no history entry behind it, so a bare router.back() is a
   * no-op that fires "GO_BACK was not handled by any navigator" and traps the parent
   * on the paywall with no way out.
   */
  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(parent)/(tabs)');
  }, [router]);

  // Purchase (or restore) completed → nothing left to sell.
  useEffect(() => {
    if (premium) {
      const t = setTimeout(dismiss, 600);
      return () => clearTimeout(t);
    }
  }, [premium, dismiss]);

  const monthly = plans.find((p) => p.id === 'monthly');
  const yearly = plans.find((p) => p.id === 'yearly');
  const selectedPlan = plans.find((p) => p.id === selected);
  const savings = yearlySavingsPercent(plans);
  const cheapestPerMonth = yearly?.perMonthString ?? monthly?.perMonthString ?? null;

  const buy = async () => {
    if (!selectedPlan || busy) return;
    setBusy(true);
    const result = await purchasePlan(selectedPlan);
    setBusy(false);
    if (result === 'failed') {
      showAppAlert('Purchase failed', 'The store could not complete the purchase. Please try again.');
    } else if (result === 'pending') {
      // Ask to Buy: the parent has to approve it before the entitlement lands.
      showAppAlert(
        'Waiting for approval',
        'Your purchase needs approval before it can complete. Premium unlocks as soon as it’s approved.',
      );
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const restored = await restorePurchases().catch(() => false);
    setBusy(false);
    showAppAlert(
      restored ? 'Purchases restored' : 'Nothing to restore',
      restored
        ? 'LittleLoop Premium is active on this device.'
        : 'No previous LittleLoop purchase was found for this store account.',
    );
  };

  if (!canManageBilling) {
    return (
      <LinearGradient colors={[MINT, MINT, '#A8E2B1']} style={[styles.flex, styles.center, { paddingHorizontal: 32 }]}>
        <StatusBar style="dark" />
        <PopIn><AppIcon name="parent-hq" size={72} style={{ borderRadius: 20 }} /></PopIn>
        <Txt weight="black" size={26} center style={{ marginTop: 18 }}>Ask the main caregiver</Txt>
        <Txt weight="bold" size={15} lineHeight={22} color="#4A5670" center style={{ marginTop: 8 }}>
          Only the main caregiver can start or manage LittleLoop Premium for this family.
        </Txt>
        <PressableScale accessibilityRole="button" onPress={dismiss} style={[styles.cta, { alignSelf: 'stretch', marginTop: 28 }]}>
          <Txt weight="black" size={17} color="#FFFFFF">Got it</Txt>
        </PressableScale>
      </LinearGradient>
    );
  }

  const ctaLabel = premium
    ? 'Premium active'
    : selectedPlan
      ? `Continue · ${selectedPlan.priceString}/${selectedPlan.id === 'yearly' ? 'year' : 'month'}`
      : 'Continue';

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[MINT, MINT, '#A8E2B1', '#5CC46C']}
        locations={[0, 0.58, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          { paddingTop: insets.top + (isTablet ? 40 : 20), paddingBottom: insets.bottom + (isTablet ? 40 : 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Appear index={0} style={styles.header}>
          <Txt weight="black" size={12} color={GREEN_DARK} center style={styles.eyebrow}>
            {eyebrow(trigger, child).toUpperCase()}
          </Txt>
          <Txt weight="black" size={isTablet ? exactType(42) : 34} lineHeight={isTablet ? exactType(46) : 39} center>Go Premium</Txt>
          <Txt weight="bold" size={isTablet ? exactType(17) : 15} lineHeight={isTablet ? exactType(24) : 21} color="#4A5670" center style={isTablet ? undefined : styles.subtitle}>
            Room for every kid, every device and every favourite.
          </Txt>
        </Appear>

        <Appear index={1} style={styles.compareHead}>
          <Txt weight="bold" size={13} color={colors.parent.muted} style={{ flex: 1 }}>Compare plans</Txt>
          <Txt weight="extrabold" size={13} center style={styles.freeCol}>Free</Txt>
          <View style={styles.premiumChip}>
            <Txt weight="black" size={13} color={GREEN_DARK} center>Premium</Txt>
          </View>
        </Appear>

        {ROWS.map((row, i) => (
          <Appear key={row.title} index={i + 2} style={styles.row}>
            <AppIcon name={row.icon} size={34} style={{ borderRadius: 10 }} />
            <View style={styles.rowCopy}>
              <Txt weight="extrabold" size={15}>{row.title}</Txt>
              <Txt weight="bold" size={12} lineHeight={16} color={colors.parent.muted}>{row.detail}</Txt>
            </View>
            <View style={styles.freeCol}>
              {row.free ? (
                <Txt weight="extrabold" size={12} color={colors.parent.muted} center>{row.free}</Txt>
              ) : (
                <Cross />
              )}
            </View>
            <View style={styles.premiumCol}>
              <PopIn delay={350 + i * 80}><Tick /></PopIn>
            </View>
          </Appear>
        ))}

        <View style={{ flex: 1, minHeight: 24 }} />

        <Appear index={8}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Go Premium now, choose a plan"
            onPress={() => setSheetOpen(true)}
            haptic="medium"
            pressedScale={0.97}
            style={styles.goCard}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="black" size={22} color={GREEN_DARK}>Go Premium now</Txt>
              <Txt weight="bold" size={14} color="#4A5670">
                {cheapestPerMonth ? `From ${cheapestPerMonth} a month` : 'Choose a plan'}
              </Txt>
            </View>
            {savings !== null ? (
              <Breathe from={0.97} to={1.05} duration={1400}>
                <View style={styles.saveChip}>
                  <Txt weight="black" size={12} color={GREEN_DARK}>Save {savings}%</Txt>
                </View>
              </Breathe>
            ) : null}
          </PressableScale>
        </Appear>

        <Appear index={9} style={{ alignItems: 'center' }}>
          <PressableScale accessibilityRole="button" onPress={dismiss} pressedScale={0.95} style={styles.freeBtn}>
            <Txt weight="extrabold" size={14} color="#FFFFFF">Continue with Free</Txt>
          </PressableScale>
        </Appear>
      </ScrollView>

      {sheetOpen ? (
        <>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close plans"
              onPress={() => !busy && setSheetOpen(false)}
              style={styles.dim}
            />
          </Animated.View>
          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, isTablet && [styles.centerWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]]}
          >
          <Animated.View
            entering={isTablet ? ZoomIn.springify().damping(20).stiffness(220) : SlideInDown.springify().damping(22).stiffness(200)}
            exiting={isTablet ? FadeOut.duration(160) : SlideOutDown.duration(220)}
            style={isTablet ? styles.card : [styles.sheet, { paddingBottom: insets.bottom + 18 }]}
          >
            {isTablet ? null : <View style={styles.grabber} />}
            <View style={styles.sheetTitle}>
              <View style={styles.starDisc}>
                <AppIcon name="premium" size={34} style={{ borderRadius: 10 }} />
              </View>
              <Txt weight="black" size={28}>Premium</Txt>
            </View>
            <Txt weight="bold" size={16} color="#4A5670" center>
              {savings !== null ? `Save ${savings}% with the yearly plan` : 'Pick the plan that suits you'}
            </Txt>

            <View style={styles.plans}>
              {(['monthly', 'yearly'] as const).map((id) => {
                const plan = id === 'yearly' ? yearly : monthly;
                const on = selected === id;
                return (
                  <PressableScale
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${id === 'yearly' ? '1 year' : '1 month'}, ${plan?.priceString ?? 'price unavailable'}`}
                    onPress={() => setSelected(id)}
                    haptic="select"
                    pressedScale={0.96}
                    style={[styles.plan, on ? styles.planOn : styles.planOff]}
                  >
                    {id === 'yearly' && savings !== null ? (
                      <View style={styles.planBadge}>
                        <Txt weight="black" size={13} color="#FFFFFF">Save {savings}%</Txt>
                      </View>
                    ) : null}
                    <View style={styles.planTop}>
                      <Txt weight="bold" size={14} color={colors.parent.muted}>{id === 'yearly' ? '1 year' : '1 month'}</Txt>
                      <Txt weight="black" size={28}>{plan?.priceString ?? '—'}</Txt>
                    </View>
                    <View style={[styles.planStrip, on && id === 'yearly' ? { backgroundColor: GREEN_TINT } : null]}>
                      <Txt weight="extrabold" size={14} color={on ? GREEN_DARK : colors.parent.muted} center>
                        {plan ? `${plan.perMonthString} /mo` : ''}
                      </Txt>
                    </View>
                  </PressableScale>
                );
              })}
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              accessibilityState={{ disabled: premium || !selectedPlan || busy }}
              onPress={() => void buy()}
              disabled={premium || !selectedPlan || busy}
              haptic="medium"
              pressedScale={0.97}
              style={[styles.cta, (premium || !selectedPlan) && { opacity: 0.6 }]}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Txt weight="black" size={17} color="#FFFFFF">{ctaLabel}</Txt>}
            </PressableScale>

            {/* Apple 3.1.2 / Play subscription rules: the purchase screen must state
                what renews, how often, and at what price, and must link to the EULA
                and privacy policy from the screen itself — not only from Settings. */}
            <Txt weight="bold" size={11.5} lineHeight={16.5} color={colors.parent.muted} center>
              {purchasesLive
                ? 'Renews automatically at the same price each period unless cancelled at least 24 hours before it ends. Payment is charged to your store account; manage or cancel anytime in your store settings.'
                : 'Store not configured — purchases are simulated in this build.'}
            </Txt>
            <View style={styles.links}>
              <Pressable onPress={() => void restore()} hitSlop={8} disabled={busy} accessibilityRole="button">
                <Txt weight="extrabold" size={12} color={colors.parent.night}>Restore purchase</Txt>
              </Pressable>
              <Txt size={12} color={colors.dotInactive}>·</Txt>
              <Pressable onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })} hitSlop={8} accessibilityRole="link">
                <Txt weight="extrabold" size={12} color={colors.parent.night}>Terms</Txt>
              </Pressable>
              <Txt size={12} color={colors.dotInactive}>·</Txt>
              <Pressable onPress={() => router.push('/(parent)/legal')} hitSlop={8} accessibilityRole="link">
                <Txt weight="extrabold" size={12} color={colors.parent.night}>Privacy Policy</Txt>
              </Pressable>
            </View>
          </Animated.View>
          </View>
        </>
      ) : null}
      {/* This screen is presented as a modal, so dialogs must draw inside it;
          a root-level <Modal> would be presented behind it and swallow taps. */}
      <AppDialogHost nested />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 22, gap: 4 },
  contentTablet: { width: '100%', maxWidth: 760 + 112, alignSelf: 'center', paddingHorizontal: 56 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  card: {
    width: 600,
    maxWidth: '100%',
    backgroundColor: MINT,
    borderRadius: 34,
    paddingTop: 34,
    paddingBottom: 30,
    paddingHorizontal: 36,
    gap: 16,
    alignItems: 'stretch',
    shadowColor: '#1B2233',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.25,
    shadowRadius: 70,
    elevation: 12,
  },
  header: { alignItems: 'center', gap: 6, marginBottom: 18 },
  eyebrow: { letterSpacing: 1.7 },
  subtitle: { maxWidth: 290 },
  compareHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  freeCol: { width: 64, alignItems: 'center' },
  premiumCol: { width: 72, alignItems: 'center' },
  premiumChip: { width: 72, paddingVertical: 5, borderRadius: 10, backgroundColor: GREEN_TINT },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowCopy: { flex: 1, minWidth: 0 },
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  cross: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C9C2B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.72)',
  },
  saveChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: GREEN_TINT },
  freeBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.28)',
  },
  dim: { flex: 1, backgroundColor: 'rgba(30,59,42,.42)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: MINT,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'stretch',
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#C9D6CD', alignSelf: 'center' },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 },
  starDisc: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFE8D6', alignItems: 'center', justifyContent: 'center' },
  plans: { flexDirection: 'row', gap: 14, marginTop: 14 },
  plan: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 3,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  planOn: { backgroundColor: '#FFFFFF', borderColor: GREEN },
  planOff: { backgroundColor: '#F7FCF8', borderColor: 'transparent' },
  planBadge: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    zIndex: 2,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  planTop: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 4 },
  planStrip: {
    paddingVertical: 12,
    backgroundColor: '#E2F5E6',
    borderBottomLeftRadius: 21,
    borderBottomRightRadius: 21,
  },
  cta: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 6,
  },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 2 },
});

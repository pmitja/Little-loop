import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FREE_LIMITS } from '@littleloop/shared';
import { AppIcon, showAppAlert, Txt, ScreenContainer, type AppIconName } from '@/components';
import { colors } from '@/theme/tokens';
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

const BENEFITS: { icon: AppIconName; title: string; detail: string }[] = [
  {
    icon: 'pin',
    title: 'Hand over your phone with confidence',
    detail: 'PIN-locked child mode shows only the videos you approved.',
  },
  {
    icon: 'add-video',
    title: 'Approve whole channels',
    detail: 'New videos from creators you trust arrive automatically — always reviewed by you first.',
  },
  {
    icon: 'profile',
    title: 'Care together',
    detail: 'Invite another caregiver to help manage playlists and limits.',
  },
  {
    icon: 'time',
    title: 'See the whole picture',
    detail: 'Know what they watched and how their screen time adds up.',
  },
];

function BenefitRow({ icon, title, detail }: (typeof BENEFITS)[number]) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <AppIcon name={icon} size={27} />
      </View>
      <View style={styles.benefitCopy}>
        <Txt weight="black" size={13.5} color="#FFFFFF">{title}</Txt>
        <Txt weight="semibold" size={11.5} color="rgba(255,255,255,.72)" lineHeight={16}>
          {detail}
        </Txt>
      </View>
    </View>
  );
}

/** s19 — paywall: fully custom plan cards over the RevenueCat offering (PLAN §12). */
export default function Paywall() {
  const router = useRouter();
  const { trigger = 'settings', child = 'Your child' } = useLocalSearchParams<{ trigger?: 'playlist-cap' | 'profile-cap' | 'channels' | 'settings'; child?: string }>();
  const premium = usePremium();
  const canManageBilling = useAppStore((state) => state.familyRole !== 'caregiver');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan['id']>('yearly');
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

  const selectedPlan = plans.find((p) => p.id === selected);
  const savings = yearlySavingsPercent(plans);

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

  const ctaTitle = premium ? 'Premium active' : 'Subscribe now';

  const context = trigger === 'playlist-cap' ? { pre: `${child}’s playlist is full — `, hl: `${FREE_LIMITS.videosPerPlaylist} of ${FREE_LIMITS.videosPerPlaylist} videos`, post: ' on the free plan.' } : trigger === 'profile-cap' ? { pre: 'You’ve used ', hl: 'every free child profile', post: '.' } : trigger === 'channels' ? { pre: '', hl: 'Approving whole channels', post: ' is part of Premium — new uploads arrive automatically, always reviewed by you.' } : null;
  if (!canManageBilling) {
    return (
      <ScreenContainer mode="plum" style={styles.container}>
        <View style={styles.closeRow}>
          <Pressable
            onPress={dismiss}
            hitSlop={8}
            style={styles.closeCircle}
            accessibilityRole="button"
            accessibilityLabel="Close Premium"
          >
            <Txt weight="extrabold" size={14} color="#FFFFFF">✕</Txt>
          </Pressable>
        </View>
        <View style={[styles.hero, { flex: 1, justifyContent: 'center', gap: 14 }]}>
          <Txt size={48}>👨‍👩‍👧</Txt>
          <Txt weight="black" size={24} color="#FFFFFF" center>Ask the main caregiver</Txt>
          <Txt weight="bold" size={14} color="rgba(255,255,255,.78)" center lineHeight={21}>
            Only the main caregiver can start or manage LittleLoop Premium for this family.
          </Txt>
          <Pressable onPress={dismiss} style={styles.cta} accessibilityRole="button">
            <Txt weight="black" size={16} color="#4A3A20">Got it</Txt>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer mode="plum" scroll style={styles.container}>
      <View style={styles.closeRow}>
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          style={styles.closeCircle}
          accessibilityRole="button"
          accessibilityLabel="Close Premium"
        >
          <Txt weight="extrabold" size={14} color="#FFFFFF">✕</Txt>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <AppIcon name="premium" size={48} />
        <Txt weight="black" size={24} color="#FFFFFF" center>Less setup. More peace of mind.</Txt>
        <Txt weight="bold" size={12.5} color="rgba(255,255,255,.76)" center lineHeight={18}>
          Keep their little world simple while you stay in control.
        </Txt>
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

      <View style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <BenefitRow key={benefit.title} {...benefit} />
        ))}
        <View style={styles.moreRow}>
          <Txt weight="black" size={11.5} color={colors.child.sun} center>
            Plus unlimited videos, multiple playlists, and up to 4 child profiles
          </Txt>
        </View>
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
              accessibilityRole="radio"
              accessibilityLabel={`${id === 'yearly' ? 'Yearly' : 'Monthly'} plan, ${plan?.priceString ?? 'price unavailable'}`}
              accessibilityState={{ selected: isSelected }}
            >
              {id === 'yearly' && savings !== null ? (
                <View style={styles.saveBadge}>
                  <Txt weight="black" size={9.5} color="#4A3A20">SAVE {savings}%</Txt>
                </View>
              ) : null}
              <Txt weight="black" size={10.5} color={colors.parent.muted}>
                {id === 'yearly' ? 'YEARLY' : 'MONTHLY'}
              </Txt>
              <Txt weight="black" size={20} color={colors.parent.night}>
                {plan?.priceString ?? '—'}
              </Txt>
              <Txt weight="bold" size={11} color={colors.parent.muted}>
                {id === 'yearly'
                  ? `per year${plan?.subline ? ` · ${plan.subline}` : ''}`
                  : (plan?.subline ?? 'per month')}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={buy}
        disabled={premium || !selectedPlan || busy}
        style={({ pressed }) => [styles.cta, (premium || !selectedPlan) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={ctaTitle}
        accessibilityState={{ disabled: premium || !selectedPlan || busy }}
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
        <Pressable onPress={dismiss} hitSlop={8} disabled={busy} accessibilityRole="button">
          <Txt weight="extrabold" size={13.5} color="rgba(255,255,255,.8)">Not now</Txt>
        </Pressable>
        <Pressable onPress={restore} hitSlop={8} disabled={busy} accessibilityRole="button">
          <Txt weight="extrabold" size={13.5} color="rgba(255,255,255,.8)">Restore purchase</Txt>
        </Pressable>
      </View>

      {/* Apple 3.1.2 / Play subscription rules: the purchase screen must state
          what renews, how often, and at what price, and must link to the EULA
          and privacy policy from the screen itself — not only from Settings. */}
      <Txt weight="semibold" size={11} color="rgba(255,255,255,.6)" center lineHeight={16.5} style={styles.legalCopy}>
        {purchasesLive
          ? `LittleLoop Premium is an auto-renewing subscription. Payment is charged to your store account at confirmation of purchase. It renews at the same price each period unless cancelled at least 24 hours before the period ends; manage or cancel it in your store account settings. Free plan: 1 child profile, 1 playlist, up to ${FREE_LIMITS.videosPerPlaylist} approved videos.`
          : `Store not configured — purchases are simulated in this build. Free plan: 1 child profile, 1 playlist, up to ${FREE_LIMITS.videosPerPlaylist} approved videos.`}
      </Txt>

      <View style={styles.legalRow}>
        <Pressable onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })} hitSlop={8} accessibilityRole="link">
          <Txt weight="bold" size={11} color="rgba(255,255,255,.75)" style={styles.legalLink}>Terms of Use</Txt>
        </Pressable>
        <Txt weight="bold" size={11} color="rgba(255,255,255,.45)">·</Txt>
        <Pressable onPress={() => router.push('/(parent)/legal')} hitSlop={8} accessibilityRole="link">
          <Txt weight="bold" size={11} color="rgba(255,255,255,.75)" style={styles.legalLink}>Privacy Policy</Txt>
        </Pressable>
      </View>
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
  hero: { alignItems: 'center', gap: 5, marginBottom: 14, paddingHorizontal: 8 },
  contextBanner: {
    backgroundColor: 'rgba(255,255,255,.14)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  benefits: {
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 14,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: { flex: 1, gap: 1 },
  moreRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,.18)',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  planRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 1,
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
  legalCopy: { marginTop: 18 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  legalLink: { textDecorationLine: 'underline' },
});

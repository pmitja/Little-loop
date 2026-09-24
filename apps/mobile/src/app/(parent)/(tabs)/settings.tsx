import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DAILY_LIMIT_MINUTES, formatDailyLimit } from '@littleloop/shared';
import { AppIcon, Appear, ChildSwitcher, IdentityCard, ParentHeader, PremiumBanner, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, showAppAlert, Txt, type PaneEntry } from '@/components';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { PaneHost, SplitView } from '@/features/tablet/PaneHost';
import { useParentIdentity } from '@/lib/auth';
import { colors } from '@/theme/tokens';
import { DEFAULT_CHILD_RULES, useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { presentCustomerCenter, restorePurchases } from '@/lib/purchases';
import { openStoreReviewPage } from '@/lib/review';
import { useDeleteAccount } from '@/features/security/deleteAccount';
import { useSignOut } from '@/features/security/signOut';
import { syncChildProfiles } from '@/features/family/syncChildProfiles';

/** Which row's screen is open beside the list on an iPad. */
type Detail = 'daily' | 'bedtime' | 'school' | 'profile' | 'pin' | 'family';

const DETAIL_ROUTES: Record<Detail, PaneEntry> = {
  daily: { route: 'time-limit' },
  bedtime: { route: 'time-limit' },
  school: { route: 'time-limit' },
  profile: { route: 'edit-child' },
  pin: { route: 'safety' },
  family: { route: 'family' },
};

export default function Settings() {
  const router = useRouter();
  const { split, listWidth } = useResponsiveLayout();
  const [detail, setDetail] = useState<Detail>('daily');
  // Phone: push the screen. iPad: open it beside the list.
  const open = (key: Detail, push: () => void) => (split ? () => setDetail(key) : push);
  const on = (key: Detail) => split && detail === key;
  const profiles = useAppStore((state) => state.childProfiles);
  const active = useAppStore((state) => state.activeChildProfileId);
  const profile = profiles.find((candidate) => candidate.id === active) ?? profiles[0] ?? null;
  const rules = useAppStore((state) =>
    profile ? state.childRules[profile.id] ?? DEFAULT_CHILD_RULES : DEFAULT_CHILD_RULES,
  );
  const videos = usePlaylistVideos(profile?.id ?? null);
  const approvedCount = videos.filter((video) => (video.status ?? 'live') === 'live').length;
  const premium = usePremium();
  const identity = useParentIdentity();
  const deleteAccount = useDeleteAccount();
  const signOut = useSignOut();
  const familyRole = useAppStore((state) => state.familyRole);
  const isOwner = familyRole !== 'caregiver';
  useFocusEffect(
    useCallback(() => {
      void syncChildProfiles();
    }, []),
  );
  // Cancel / change plan / refund all live in RevenueCat's Customer Center; it
  // is unavailable in mock builds, where there is no real subscription to manage.
  const manageSubscription = async () => {
    const presented = await presentCustomerCenter().catch(() => false);
    if (!presented) showAppAlert('Manage subscription', 'The store is not configured in this build, so there is no subscription to manage.');
  };
  // Apple 3.1.1 requires a restore path outside the paywall: a subscriber who
  // reinstalls lands here already "free", and never sees the paywall's copy.
  const restore = async () => {
    const restored = await restorePurchases().catch(() => false);
    showAppAlert(
      restored ? 'Purchases restored' : 'Nothing to restore',
      restored
        ? 'LittleLoop Premium is active on this device.'
        : 'No previous LittleLoop purchase was found for this store account.',
    );
  };
  const limitLabel = formatDailyLimit(profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default);
  const name = profile?.nickname ?? 'Child';
  let block = 0;
  const next = () => block++;

  const list = <ScreenContainer scroll style={styles.root}>
    <Appear index={next()}><ParentHeader title="Settings" /></Appear>
    <Appear index={next()}><IdentityCard name={identity.name ?? 'Parent'} email={identity.email ?? undefined} /></Appear>
    {isOwner && !premium ? (
      <Appear index={next()}>
        <PremiumBanner onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })} />
      </Appear>
    ) : null}

    <Appear index={next()} style={styles.rulesHead}>
      <Txt weight="black" size={17} numberOfLines={1} style={{ flexShrink: 1 }}>{name}’s rules</Txt>
      <ChildSwitcher
        compact
        profiles={profiles}
        activeId={profile?.id ?? null}
        onSelect={(id) => useAppStore.getState().setActiveChildProfileId(id)}
        onAdd={profiles.length < 2 ? () => router.push(premium ? '/(parent)/add-child' : { pathname: '/paywall', params: { trigger: 'profile-cap' } }) : undefined}
      />
    </Appear>
    <Appear index={next()}>
      <SettingsGroup>
        <SettingsRow icon={<AppIcon name="time" size={32} />} iconBg="transparent" title="Daily time" value={limitLabel} chevron selected={on('daily')} onPress={open('daily', () => router.push('/(parent)/time-limit'))} />
        <SettingsRow icon={<AppIcon name="weekend" size={32} />} iconBg="transparent" title="Bedtime" value={rules.bedtimeEnabled ? rules.bedtime : 'Off'} chevron selected={on('bedtime')} onPress={open('bedtime', () => router.push('/(parent)/time-limit'))} />
        <SettingsRow icon={<AppIcon name="school" size={32} />} iconBg="transparent" title="School hours" value={rules.schoolTimeEnabled ? `${rules.schoolStart} – ${rules.schoolEnd}` : 'Off'} chevron selected={on('school')} onPress={open('school', () => router.push('/(parent)/time-limit'))} />
        {profile ? <SettingsRow icon={<AppIcon name="profile" size={32} />} iconBg="transparent" title="Name and buddy" value={`${profile.nickname} · ${profile.avatar[0].toUpperCase()}${profile.avatar.slice(1)}`} chevron selected={on('profile')} onPress={open('profile', () => router.push({ pathname: '/(parent)/edit-child', params: { id: profile.id } }))} /> : null}
        <SettingsRow icon={<AppIcon name="videos" size={32} />} iconBg="transparent" title="Approved videos" value={`${approvedCount}`} chevron onPress={() => router.navigate('/(parent)/(tabs)/playlist')} />
      </SettingsGroup>
    </Appear>

    <Appear index={next()}><SectionLabel style={styles.label}>Safety and family</SectionLabel></Appear>
    <Appear index={next()}>
      <SettingsGroup>
        <SettingsRow icon={<AppIcon name="pin" size={32} />} iconBg="transparent" title="Grown-up PIN" value="Change or reset" chevron selected={on('pin')} onPress={open('pin', () => router.push('/(parent)/safety'))} />
        <SettingsRow icon={<AppIcon name="kid-device" size={32} />} iconBg="transparent" title="Family" value={isOwner ? 'Devices and caregivers' : 'Shared with you'} chevron selected={on('family')} onPress={open('family', () => router.push('/(parent)/family'))} />
      </SettingsGroup>
    </Appear>

    <Appear index={next()}><SectionLabel style={styles.label}>Account</SectionLabel></Appear>
    <Appear index={next()}>
      <SettingsGroup>
        {isOwner && premium ? <SettingsRow icon={<AppIcon name="premium" size={32} />} iconBg="transparent" title="Manage subscription" value="Premium" chevron onPress={manageSubscription} /> : null}
        {isOwner ? <SettingsRow icon={<AppIcon name="restore" size={32} />} iconBg="transparent" title="Restore purchases" chevron onPress={restore} /> : null}
        <SettingsRow icon={<AppIcon name="privacy" size={32} />} iconBg="transparent" title="Privacy policy" chevron onPress={() => router.push('/(parent)/legal')} />
        <SettingsRow icon={<AppIcon name="terms" size={32} />} iconBg="transparent" title="Terms of use" chevron onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })} />
        <SettingsRow icon={<AppIcon name="premium" size={32} />} iconBg="transparent" title="Rate LittleLoop" chevron onPress={() => void openStoreReviewPage()} />
      </SettingsGroup>
    </Appear>
    {/* Removing a child lives on their Edit profile screen, next to their name.
        Apple 5.1.1(v): an app that creates accounts must let the user delete
        theirs from inside the app. The privacy policy also points here. */}
    <Appear index={next()}>
      <SettingsGroup>
        <SettingsRow icon={<AppIcon name="restore" size={32} />} iconBg="transparent" title="Sign out" chevron onPress={signOut} />
        <SettingsRow icon={<AppIcon name="delete" size={32} />} iconBg="transparent" title="Delete account and data" titleColor={colors.red} chevron onPress={deleteAccount} />
      </SettingsGroup>
    </Appear>
  </ScreenContainer>;

  if (!split) return list;
  // Keyed to the child, so picking another child in the list reloads their form.
  const root = detail === 'profile' && profile ? { route: 'edit-child' as const, params: { id: profile.id } } : DETAIL_ROUTES[detail];
  return <SplitView listWidth={listWidth} list={list} detail={<PaneHost root={root} />} />;
}
const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 14 },
  rulesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  label: { marginTop: 6, fontSize: 17 * 1.1 },
});

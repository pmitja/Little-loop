import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DAILY_LIMIT_MINUTES, formatDailyLimit } from '@littleloop/shared';
import { AppIcon, ChildSwitcher, IdentityCard, ParentHeader, PremiumBanner, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, showAppAlert } from '@/components';
import { useParentIdentity } from '@/lib/auth';
import { colors } from '@/theme/tokens';
import { DEFAULT_CHILD_RULES, useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { presentCustomerCenter, restorePurchases } from '@/lib/purchases';
import { useDeleteAccount } from '@/features/security/deleteAccount';
import { syncChildProfiles } from '@/features/family/syncChildProfiles';

export default function Settings() {
  const router = useRouter();
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
  const timeSummary = `${formatDailyLimit(profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default)} daily${rules.bedtimeEnabled ? ` · bedtime ${rules.bedtime}` : ''}`;

  return <ScreenContainer scroll style={styles.root}>
    <ParentHeader title="Settings" />
    <IdentityCard name={identity.name ?? 'Parent'} email={identity.email ?? undefined} />

    <SectionLabel>Choose a child</SectionLabel>
    <ChildSwitcher
      profiles={profiles}
      activeId={profile?.id ?? null}
      onSelect={(id) => useAppStore.getState().setActiveChildProfileId(id)}
      onAdd={() => router.push(premium ? '/(parent)/add-child' : { pathname: '/paywall', params: { trigger: 'profile-cap' } })}
      onEdit={(id) => router.push({ pathname: '/(parent)/edit-child', params: { id } })}
    />

    <SectionLabel>{profile?.nickname ?? 'Child'}</SectionLabel>
    <SettingsGroup>
      {profile ? <SettingsRow icon={<AppIcon name="profile" />} iconBg="transparent" title="Profile" value="Name and avatar" chevron onPress={() => router.push({ pathname: '/(parent)/edit-child', params: { id: profile.id } })} /> : null}
      <SettingsRow icon={<AppIcon name="time" />} iconBg="transparent" title="Time and bedtime" value={timeSummary} chevron onPress={() => router.push('/(parent)/time-limit')} />
      <SettingsRow icon={<AppIcon name="videos" />} iconBg="transparent" title="Approved videos" value={`${approvedCount} ${approvedCount === 1 ? 'video' : 'videos'}`} chevron onPress={() => router.navigate('/(parent)/(tabs)/playlist')} />
    </SettingsGroup>

    <SectionLabel>Safety</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon={<AppIcon name="pin" />} iconBg="transparent" title="Parent PIN" value="Change or reset" chevron onPress={() => router.push('/(parent)/safety')} />
    </SettingsGroup>

    <SectionLabel>Family</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon={<AppIcon name="profile" />} iconBg="transparent" title="Caregivers" value={isOwner ? 'Manage access' : 'Shared with you'} chevron onPress={() => router.push('/(parent)/caregivers')} />
    </SettingsGroup>

    {isOwner && !premium ? <PremiumBanner onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })} /> : null}
    <SectionLabel>Account</SectionLabel>
    <SettingsGroup>
      {isOwner && premium ? <SettingsRow icon={<AppIcon name="premium" />} iconBg="transparent" title="Manage subscription" value="Premium" chevron onPress={manageSubscription} /> : null}
      {isOwner ? <SettingsRow icon={<AppIcon name="restore" />} iconBg="transparent" title="Restore purchases" chevron onPress={restore} /> : null}
      <SettingsRow icon={<AppIcon name="privacy" />} iconBg="transparent" title="Privacy policy" chevron onPress={() => router.push('/(parent)/legal')} />
      <SettingsRow icon={<AppIcon name="terms" />} iconBg="transparent" title="Terms of use" chevron onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })} />
    </SettingsGroup>
    {/* Removing a child now lives on their Edit profile screen, next to their name:
        this row acted on whichever profile was active, which was easy to get wrong
        and hard to find. Account deletion below is a different, account-wide action. */}
    {/* Apple 5.1.1(v): an app that creates accounts must let the user delete
        theirs from inside the app. The privacy policy also points here. */}
    <SettingsGroup>
      <SettingsRow icon={<AppIcon name="delete" />} iconBg="transparent" title="Delete account and data" titleColor={colors.red} chevron onPress={deleteAccount} />
    </SettingsGroup>
  </ScreenContainer>;
}
const styles = StyleSheet.create({ root: { paddingTop: 16, gap: 15 } });

import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChildSwitcher, IdentityCard, ParentHeader, PremiumBanner, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow } from '@/components';
import { useParentIdentity } from '@/lib/auth';
import { colors } from '@/theme/tokens';
import { deleteChildProfile } from '@/features/family/deleteChildProfile';
import { DEFAULT_CHILD_RULES, useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { presentCustomerCenter, restorePurchases } from '@/lib/purchases';
import { useDeleteAccount } from '@/features/security/deleteAccount';

export default function Settings() {
  const router = useRouter(); const profiles = useAppStore(s => s.childProfiles); const active = useAppStore(s => s.activeChildProfileId);
  const profile = profiles.find(p => p.id === active) ?? profiles[0] ?? null;
  const rules = useAppStore(s => profile ? s.childRules[profile.id] ?? DEFAULT_CHILD_RULES : DEFAULT_CHILD_RULES);
  const videos = usePlaylistVideos(profile?.id ?? null); const premium = usePremium(); const biometric = useLockStore(s => s.biometricEnabled);
  const identity = useParentIdentity();
  const deleteAccount = useDeleteAccount();
  // Cancel / change plan / refund all live in RevenueCat's Customer Center; it
  // is unavailable in mock builds, where there is no real subscription to manage.
  const manageSubscription = async () => {
    const presented = await presentCustomerCenter().catch(() => false);
    if (!presented) Alert.alert('Manage subscription', 'The store is not configured in this build, so there is no subscription to manage.');
  };
  // Apple 3.1.1 requires a restore path outside the paywall: a subscriber who
  // reinstalls lands here already "free", and never sees the paywall's copy.
  const restore = async () => {
    const restored = await restorePurchases().catch(() => false);
    Alert.alert(
      restored ? 'Purchases restored' : 'Nothing to restore',
      restored
        ? 'LittleLoop Premium is active on this device.'
        : 'No previous LittleLoop purchase was found for this store account.',
    );
  };
  return <ScreenContainer scroll style={styles.root}>
    <ParentHeader title="Settings" />
    <IdentityCard name={identity.name ?? 'Parent'} email={identity.email ?? undefined} onPress={() => Alert.alert('Account', 'Account settings are coming soon.')} />
    <ChildSwitcher profiles={profiles} activeId={profile?.id ?? null} onSelect={id => useAppStore.getState().setActiveChildProfileId(id)} onAdd={() => router.push(premium ? '/(parent)/add-child' : { pathname: '/paywall', params: { trigger: 'profile-cap' } })} />
    {!premium ? <PremiumBanner onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })} /> : null}
    <SectionLabel>Subscription</SectionLabel>
    <SettingsGroup>
      {premium ? <SettingsRow icon="⭐" iconBg="#FFF3D9" title="Manage subscription" value="Premium ›" onPress={manageSubscription} /> : null}
      <SettingsRow icon="↺" iconBg="#EAF6FA" title="Restore purchases" onPress={restore} />
    </SettingsGroup>
    <SectionLabel>{profile?.nickname ?? 'Child'}’s rules</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon="⏰" iconBg="#FFF3D9" title="Daily limit" value={`${profile?.dailyLimitMinutes ?? 45} min ›`} onPress={() => router.push('/(parent)/time-limit')} />
      <SettingsRow icon="🌙" iconBg="#EFE1F8" title="Bedtime cut-off" value={rules.bedtimeEnabled ? `${rules.bedtime} ›` : 'Off ›'} onPress={() => router.push('/(parent)/time-limit')} />
      <SettingsRow icon="▶" iconBg="#EAF6FA" title="Playlist" value={`${videos.length} videos ›`} onPress={() => router.navigate('/(parent)/(tabs)/playlist')} />
    </SettingsGroup>
    <SectionLabel>Safety</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon="🔒" iconBg="#EAF6FA" title="PIN & Face ID" value={biometric ? 'On ›' : 'Off ›'} onPress={() => router.push('/(parent)/safety')} />
      <SettingsRow icon="🛡" iconBg="#EAFBF0" title="Kid-proof exit" toggle={{ value: rules.kidProofExit, onChange: value => { if (profile) useAppStore.getState().updateChildRules(profile.id, { kidProofExit: value }); } }} />
    </SettingsGroup>
    <SectionLabel>About</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon="🔐" iconBg="#EFE1F8" title="Privacy policy" value="›" onPress={() => router.push('/(parent)/legal')} />
      <SettingsRow icon="📄" iconBg="#EAF6FA" title="Terms of use" value="›" onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })} />
    </SettingsGroup>
    {profile ? <SettingsGroup>
      <SettingsRow
        icon="🗑"
        iconBg="#FDEAE9"
        title={`Remove ${profile.nickname}’s profile`}
        titleColor={colors.red}
        onPress={() => Alert.alert(
          `Remove ${profile.nickname}’s profile?`,
          'Their playlist, time limits, and watch history will be deleted. This can’t be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => { void deleteChildProfile(profile.id); } },
          ],
        )}
      />
    </SettingsGroup> : null}
    {/* Apple 5.1.1(v): an app that creates accounts must let the user delete
        theirs from inside the app. The privacy policy also points here. */}
    <SettingsGroup>
      <SettingsRow icon="⚠️" iconBg="#FDEAE9" title="Delete account & data" titleColor={colors.red} onPress={deleteAccount} />
    </SettingsGroup>
  </ScreenContainer>;
}
const styles = StyleSheet.create({ root: { paddingTop: 16, gap: 15 } });

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

export default function Settings() {
  const router = useRouter(); const profiles = useAppStore(s => s.childProfiles); const active = useAppStore(s => s.activeChildProfileId);
  const profile = profiles.find(p => p.id === active) ?? profiles[0] ?? null;
  const rules = useAppStore(s => profile ? s.childRules[profile.id] ?? DEFAULT_CHILD_RULES : DEFAULT_CHILD_RULES);
  const videos = usePlaylistVideos(profile?.id ?? null); const premium = usePremium(); const biometric = useLockStore(s => s.biometricEnabled);
  const identity = useParentIdentity();
  return <ScreenContainer scroll style={styles.root}>
    <ParentHeader title="Settings" />
    <IdentityCard name={identity.name ?? 'Parent'} email={identity.email ?? undefined} onPress={() => Alert.alert('Account', 'Account settings are coming soon.')} />
    <ChildSwitcher profiles={profiles} activeId={profile?.id ?? null} onSelect={id => useAppStore.getState().setActiveChildProfileId(id)} onAdd={() => router.push(premium ? '/(parent)/add-child' : { pathname: '/paywall', params: { trigger: 'profile-cap' } })} />
    {!premium ? <PremiumBanner onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })} /> : null}
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
  </ScreenContainer>;
}
const styles = StyleSheet.create({ root: { paddingTop: 16, gap: 15 } });

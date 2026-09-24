import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appear, ScreenContainer, StepHeader, Txt } from '@/components';
import { colors, exactType } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { ChildProfileForm } from '@/features/family/ChildProfileForm';
import { syncChildProfiles } from '@/features/family/syncChildProfiles';
import { useDeleteAccount } from '@/features/security/deleteAccount';
import { useAppStore } from '@/stores/appStore';

/**
 * s06 — child profile creation: nickname, age range, avatar, optional daily limit.
 *
 * Two entry points: first-run onboarding, and the parent tabs bouncing here when the
 * last child is deleted (there is nothing to show a parent without a child).
 */
export default function ChildProfileScreen() {
  const router = useRouter();
  // iPad: roomier margins; in landscape the name and the buddies sit side by side.
  const { isTablet, landscape } = useResponsiveLayout();
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);
  // Set only by the parent tabs bouncing here. onboardingComplete can't stand in for
  // this — welcome.tsx flips it at the *start* of onboarding, not the end.
  const forced = useLocalSearchParams<{ forced?: string }>().forced === '1';
  const deleteAccount = useDeleteAccount();
  const [checking, setChecking] = useState(!hasProfile);
  const creatingProfile = useRef(false);

  const finishNewProfile = () => {
    creatingProfile.current = true;
    router.replace(forced ? '/(parent)/(tabs)' : '/(onboarding)/first-video');
  };

  // A profile adopted from the account is not onboarding progress. This path is
  // used after PIN reset, reinstall, and sign-in on another device, so return to
  // the profile picker instead of asking an established family for a first video.
  const finishExistingProfile = () =>
    router.replace(forced ? '/(parent)/(tabs)' : '/whos-watching');

  // The account may already have its child (reinstall, second device). Creating a
  // second one would hit the free-tier cap and strand the parent here, so adopt
  // what the server has and move on instead of ever showing the form.
  useEffect(() => {
    if (hasProfile) {
      // ChildProfileForm writes to the store immediately before onCreated. Do not
      // let that render race the intended first-profile → first-video transition.
      if (!creatingProfile.current) finishExistingProfile();
      return;
    }
    let cancelled = false;
    void syncChildProfiles().then((profiles) => {
      if (cancelled) return;
      if (profiles && profiles.length > 0) finishExistingProfile();
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile, forced, router]);

  if (checking) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll style={[styles.container, isTablet && styles.tablet]}>
      {!forced ? <View style={styles.stepLabel}><StepHeader step={2} total={3} /></View> : null}
      <Appear index={0}>
        <Txt weight="black" size={isTablet ? exactType(38) : 30} lineHeight={isTablet ? exactType(44) : 35}>
          {forced ? 'Add a child to continue' : 'Who is this for?'}
        </Txt>
        <Txt weight="bold" size={15} color={colors.muted} style={{ marginTop: 6, marginBottom: 22 }}>
          {forced
            ? 'LittleLoop needs at least one child profile. Only a nickname is needed.'
            : 'Only a nickname. You can add more kids later.'}
        </Txt>
      </Appear>
      <Appear index={1} style={isTablet && landscape ? styles.fill : undefined}>
      <ChildProfileForm
        columns={isTablet && landscape}
        submitLabel="Continue"
        onCreated={finishNewProfile}
        // A 402 here means the server already has this account's child — adopt it
        // rather than showing a paywall for a profile they already have.
        onLimitReached={async () => {
          const profiles = await syncChildProfiles();
          if (profiles && profiles.length > 0) finishExistingProfile();
        }}
      />
      </Appear>
      {/* Without a child there is no route to Settings, and account deletion must stay
          reachable in-app (Apple 5.1.1(v)) — so it lives here too. */}
      {forced ? (
        <Pressable onPress={deleteAccount} hitSlop={10} style={styles.deleteLink}>
          <Txt weight="bold" size={13} color={colors.muted}>
            Delete my account
          </Txt>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { marginBottom: 24 },
  tablet: { paddingTop: 24, paddingHorizontal: 56, paddingBottom: 24 },
  fill: { flex: 1 },
  deleteLink: { alignSelf: 'center', marginTop: 26, padding: 8 },
});

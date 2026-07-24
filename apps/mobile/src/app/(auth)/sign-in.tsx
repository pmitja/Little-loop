import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';
import { authConfigured } from '@/lib/auth';
import { SocialButton, type SocialProvider } from '@/features/auth/SocialButton';
import { APPLE_SIGN_IN_ENABLED, signInWithProvider } from '@/features/auth/socialSignIn';
import { useLockStore } from '@/stores/lockStore';
import { useAppStore } from '@/stores/appStore';

function useNextRoute() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const pinSet = useLockStore((s) => s.pinSet);
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);

  if (!onboardingComplete) return '/(onboarding)/welcome' as const;
  if (!pinSet) return '/(onboarding)/pin-setup' as const;
  if (!hasProfile) return '/(onboarding)/child-profile' as const;
  return '/(parent)/(tabs)' as const;
}

function getPendingInviteRoute() {
  const token = useAppStore.getState().pendingFamilyInvite;
  return token ? ({ pathname: '/accept-invite', params: { token } } as const) : null;
}

export default function SignIn() {
  if (!authConfigured) return <DevBypass />;
  return <AuthSignIn />;
}

function DevBypass() {
  const router = useRouter();
  const nextRoute = useNextRoute();

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Logo size={72} />
        <Txt weight="black" size={27} center>
          Welcome to LittleLoop
        </Txt>
        <Txt weight="semibold" size={14} color={colors.muted} center>
          Auth isn’t configured. Continue in local development mode.
        </Txt>
      </View>
      <Button title="Continue" onPress={() => router.replace(nextRoute)} />
    </ScreenContainer>
  );
}

function AuthSignIn() {
  const router = useRouter();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextRoute = useNextRoute();

  const signInWith = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const result = await signInWithProvider(provider);
      if (!result.ok) {
        if (result.error) setError(result.error);
        return;
      }
      router.replace(getPendingInviteRoute() ?? nextRoute);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenContainer scroll style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoStage}>
          <Logo size={76} />
        </View>
        <Txt weight="black" size={27} center>
          Welcome back
        </Txt>
        <Txt weight="semibold" size={14} color={colors.muted} center lineHeight={21}>
          Your approved videos and child settings are waiting.
        </Txt>
      </View>

      <View style={styles.socialButtons}>
        {APPLE_SIGN_IN_ENABLED ? (
          <SocialButton
            provider="apple"
            busy={busy !== null}
            onPress={() => signInWith('apple')}
          />
        ) : null}
        <SocialButton
          provider="google"
          busy={busy !== null}
          onPress={() => signInWith('google')}
        />
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
          <Txt weight="bold" size={13} color={colors.red}>{error}</Txt>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Txt weight="semibold" size={14} color={colors.muted}>
          New to LittleLoop?
        </Txt>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Txt weight="extrabold" size={14} color={colors.primaryDark}>
              Create account
            </Txt>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 30, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 26 },
  logoStage: { marginBottom: 4 },
  socialButtons: { gap: 10 },
  errorBanner: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#FDEAE9',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
});

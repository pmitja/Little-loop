import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';
import { authConfigured } from '@/lib/auth';
import { SocialButton, type SocialProvider } from '@/features/auth/SocialButton';
import { APPLE_SIGN_IN_ENABLED, signInWithProvider } from '@/features/auth/socialSignIn';
import { useAppStore } from '@/stores/appStore';

/** Social-only account creation — the first social sign-in creates the account. */
export default function SignUp() {
  if (!authConfigured) return <DevBypass />;
  return <AuthSignUp />;
}

function DevBypass() {
  const router = useRouter();
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Logo size={64} />
        <Txt weight="black" size={26}>
          Create your account
        </Txt>
        <Txt weight="semibold" size={14} color={colors.muted} center>
          Auth isn’t configured (EXPO_PUBLIC_API_URL). Continuing in local dev mode.
        </Txt>
      </View>
      <Button title="Continue" onPress={() => router.replace('/(onboarding)/pin-setup')} />
    </ScreenContainer>
  );
}

function AuthSignUp() {
  const router = useRouter();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  const signUpWith = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const result = await signInWithProvider(provider);
      if (!result.ok) {
        if (result.error) setError(result.error);
        return;
      }
      const token = useAppStore.getState().pendingFamilyInvite;
      router.replace(
        token
          ? { pathname: '/accept-invite', params: { token } }
          : onboardingComplete
            ? '/(onboarding)/pin-setup'
            : '/(onboarding)/welcome',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenContainer scroll style={styles.container}>
      <View style={styles.header}>
        <Logo size={64} />
        <Txt weight="black" size={26}>
          Create parent account
        </Txt>
        <Txt weight="semibold" size={14} color={colors.muted} center>
          Save your children’s videos and settings securely.
        </Txt>
      </View>

      <View style={styles.socialButtons}>
        {APPLE_SIGN_IN_ENABLED ? (
          <SocialButton
            provider="apple"
            busy={busy !== null}
            onPress={() => signUpWith('apple')}
          />
        ) : null}
        <SocialButton
          provider="google"
          busy={busy !== null}
          onPress={() => signUpWith('google')}
        />
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
          <Txt weight="bold" size={13} color={colors.red}>{error}</Txt>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Txt weight="semibold" size={14} color={colors.muted}>
          Already have an account?
        </Txt>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Txt weight="extrabold" size={14} color={colors.primary}>
              Sign in
            </Txt>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 60, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 28 },
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

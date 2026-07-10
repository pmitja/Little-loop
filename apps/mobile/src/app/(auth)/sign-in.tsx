import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn, useSignInWithApple, useSSO } from '@clerk/clerk-expo';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors, shadows } from '@/theme/tokens';
import { clerkEnabled } from '@/lib/auth';
import { Field } from '@/features/auth/Field';
import { useLockStore } from '@/stores/lockStore';
import { useAppStore } from '@/stores/appStore';

type SocialProvider = 'apple' | 'google';

function useNextRoute() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const pinSet = useLockStore((s) => s.pinSet);
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);

  if (!onboardingComplete) return '/(onboarding)/welcome' as const;
  if (!pinSet) return '/(onboarding)/pin-setup' as const;
  if (!hasProfile) return '/(onboarding)/child-profile' as const;
  return '/(parent)/(tabs)' as const;
}

export default function SignIn() {
  if (!clerkEnabled) return <DevBypass />;
  return <ClerkSignIn />;
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
          Clerk isn’t configured. Continue in local development mode.
        </Txt>
      </View>
      <Button title="Continue" onPress={() => router.replace(nextRoute)} />
    </ScreenContainer>
  );
}

function SocialButton({
  provider,
  busy,
  onPress,
}: {
  provider: SocialProvider;
  busy: boolean;
  onPress: () => void;
}) {
  const apple = provider === 'apple';
  const title = apple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        apple ? styles.appleButton : styles.googleButton,
        pressed && !busy ? styles.buttonPressed : null,
        busy ? styles.buttonDisabled : null,
      ]}
    >
      <Txt weight="extrabold" size={15} color={apple ? '#FFFFFF' : colors.parent.night}>
        {title}
      </Txt>
    </Pressable>
  );
}

function ClerkSignIn() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextRoute = useNextRoute();

  const finishSocialSignIn = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);
    try {
      const result =
        provider === 'apple'
          ? await startAppleAuthenticationFlow()
          : await startSSOFlow({ strategy: 'oauth_google' });

      if (!result.createdSessionId || !result.setActive) {
        return;
      }

      await result.setActive({ session: result.createdSessionId });
      router.replace(nextRoute);
    } catch (cause: unknown) {
      const clerkError = cause as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkError.errors?.[0]?.longMessage ??
          clerkError.errors?.[0]?.message ??
          `Couldn’t continue with ${provider === 'apple' ? 'Apple' : 'Google'}.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!isLoaded) return;
    setBusy('email');
    setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace(nextRoute);
      } else {
        setError('Additional verification is required to finish signing in.');
      }
    } catch (cause: unknown) {
      const clerkError = cause as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkError.errors?.[0]?.longMessage ??
          clerkError.errors?.[0]?.message ??
          'Sign-in failed.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.logoStage, shadows.card]}>
            <Logo size={64} />
          </View>
          <Txt weight="black" size={27} center>
            Welcome to LittleLoop
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} center lineHeight={21}>
            Sign in to manage your family’s approved videos.
          </Txt>
        </View>

        <View style={styles.socialButtons}>
          {Platform.OS === 'ios' ? (
            <SocialButton
              provider="apple"
              busy={busy !== null}
              onPress={() => finishSocialSignIn('apple')}
            />
          ) : null}
          <SocialButton
            provider="google"
            busy={busy !== null}
            onPress={() => finishSocialSignIn('google')}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Txt weight="bold" size={12} color={colors.subtle}>
            OR CONTINUE WITH EMAIL
          </Txt>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={error}
          />
          <Button title="Sign In" onPress={submit} loading={busy === 'email'} disabled={busy !== null} />
        </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingTop: 30, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 26 },
  logoStage: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  socialButtons: { gap: 10 },
  socialButton: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: { backgroundColor: '#111111' },
  googleButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonPressed: { opacity: 0.78 },
  buttonDisabled: { opacity: 0.55 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  form: { gap: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
});

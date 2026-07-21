import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn, useSignInWithApple, useSSO } from '@clerk/clerk-expo';
import Svg, { Path } from 'react-native-svg';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';
import { clerkEnabled } from '@/lib/auth';
import { Field } from '@/features/auth/Field';
import { useLockStore } from '@/stores/lockStore';
import { useAppStore } from '@/stores/appStore';

type SocialProvider = 'apple' | 'google';

function SocialProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === 'apple') {
    return (
      <Svg width={21} height={21} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Path
          fill="#FFFFFF"
          d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.33-.07 2.26.74 3.04.79 1.17-.24 2.29-.93 3.54-.84 1.5.12 2.63.71 3.38 1.78-3.1 1.86-2.36 5.95.48 7.09-.57 1.5-1.31 2.99-2.44 4.15ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 18 18" accessibilityElementsHidden>
      <Path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <Path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
      <Path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </Svg>
  );
}

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
      <View style={styles.socialIcon} pointerEvents="none">
        <SocialProviderIcon provider={provider} />
      </View>
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
      router.replace(getPendingInviteRoute() ?? nextRoute);
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
        router.replace(getPendingInviteRoute() ?? nextRoute);
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
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
          {error ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Txt weight="bold" size={13} color={colors.red}>{error}</Txt>
            </View>
          ) : null}
          <Button
            title="Sign in"
            onPress={submit}
            loading={busy === 'email'}
            disabled={busy !== null || !email.trim() || !password}
          />
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
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 30, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 26 },
  logoStage: { marginBottom: 4 },
  socialButtons: { gap: 10 },
  socialButton: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 52,
  },
  socialIcon: { position: 'absolute', left: 18, alignItems: 'center', justifyContent: 'center' },
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
  errorBanner: { borderRadius: 14, backgroundColor: '#FDEAE9', paddingHorizontal: 14, paddingVertical: 11 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
});

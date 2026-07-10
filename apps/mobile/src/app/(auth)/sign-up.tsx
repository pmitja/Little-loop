import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';
import { clerkEnabled } from '@/lib/auth';
import { Field } from '@/features/auth/Field';
import { useAppStore } from '@/stores/appStore';

/** Clerk sign-up themed to the design; email + password, then email code verify. */
export default function SignUp() {
  // The Clerk hooks below require ClerkProvider, which the root layout only
  // mounts when a publishable key is configured — bypass in local dev mode.
  if (!clerkEnabled) return <DevBypass />;
  return <ClerkSignUp />;
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
          Clerk isn’t configured (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY). Continuing in local dev
          mode.
        </Txt>
      </View>
      <Button title="Continue" onPress={() => router.replace('/(onboarding)/pin-setup')} />
    </ScreenContainer>
  );
}

function ClerkSignUp() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  const submit = async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerifying(true);
    } catch (e: unknown) {
      const err = e as { errors?: { longMessage?: string; message?: string }[] };
      setError(err.errors?.[0]?.longMessage ?? err.errors?.[0]?.message ?? 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace(
          onboardingComplete ? '/(onboarding)/pin-setup' : '/(onboarding)/welcome',
        );
      } else {
        setError('Verification incomplete — try again.');
      }
    } catch {
      setError('That code doesn’t match. Check your email and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.header}>
          <Logo size={64} />
          <Txt weight="black" size={26}>
            {verifying ? 'Check your email' : 'Create your account'}
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} center>
            {verifying
              ? `We sent a 6-digit code to ${email.trim()}.`
              : 'Your playlists sync securely across devices.'}
          </Txt>
        </View>
        <View style={{ gap: 16 }}>
          {verifying ? (
            <Field
              label="Verification code"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              error={error}
            />
          ) : (
            <>
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
                placeholder="8+ characters"
                secureTextEntry
                error={error}
              />
            </>
          )}
          <Button
            title={verifying ? 'Verify' : 'Sign Up'}
            onPress={verifying ? verify : submit}
            loading={busy}
          />
        </View>
        <View style={styles.footer}>
          <Txt weight="semibold" size={14} color={colors.muted}>
            Already have an account?
          </Txt>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable hitSlop={8}>
              <Txt weight="extrabold" size={14} color={colors.primary}>
                Sign in
              </Txt>
            </Pressable>
          </Link>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 60, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 28 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Button, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';
import { clerkEnabled } from '@/lib/auth';
import { Field } from '@/features/auth/Field';
import { useLockStore } from '@/stores/lockStore';
import { useAppStore } from '@/stores/appStore';

/**
 * PIN is per-device: after sign-in on a fresh device, PIN setup is still required.
 */
function useNextRoute() {
  const pinSet = useLockStore((s) => s.pinSet);
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);
  if (!pinSet) return '/(onboarding)/pin-setup' as const;
  if (!hasProfile) return '/(onboarding)/child-profile' as const;
  return '/(parent)/(tabs)' as const;
}

/** Clerk sign-in themed to the design. */
export default function SignIn() {
  // Clerk hooks require ClerkProvider, mounted only when a key is configured.
  if (!clerkEnabled) return <DevBypass />;
  return <ClerkSignIn />;
}

function DevBypass() {
  const router = useRouter();
  const nextRoute = useNextRoute();
  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Logo size={64} />
        <Txt weight="black" size={26}>
          Welcome back
        </Txt>
        <Txt weight="semibold" size={14} color={colors.muted} center>
          Clerk isn’t configured (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY). Continuing in local dev
          mode.
        </Txt>
      </View>
      <Button title="Continue" onPress={() => router.replace(nextRoute)} />
    </ScreenContainer>
  );
}

function ClerkSignIn() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRoute = useNextRoute();

  const submit = async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace(nextRoute);
      } else {
        setError('Additional verification required — finish signing in on the web.');
      }
    } catch (e: unknown) {
      const err = e as { errors?: { longMessage?: string; message?: string }[] };
      setError(err.errors?.[0]?.longMessage ?? err.errors?.[0]?.message ?? 'Sign-in failed.');
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
            Welcome back
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} center>
            Sign in to manage your family’s playlists.
          </Txt>
        </View>
        <View style={{ gap: 16 }}>
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
          <Button title="Sign In" onPress={submit} loading={busy} />
        </View>
        <View style={styles.footer}>
          <Txt weight="semibold" size={14} color={colors.muted}>
            New to LittleLoop?
          </Txt>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Txt weight="extrabold" size={14} color={colors.primary}>
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
  container: { paddingTop: 60, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 28 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
});

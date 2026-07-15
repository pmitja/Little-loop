import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenContainer, Txt } from '@/components';
import { acceptFamilyInvite } from '@/features/family/familyApi';
import { useAuthStatus } from '@/lib/auth';
import { useAppStore } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { colors } from '@/theme/tokens';

export default function AcceptInvite() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { isLoaded, isSignedIn } = useAuthStatus();
  const pending = useAppStore((state) => state.pendingFamilyInvite);
  const token = params.token ?? pending;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.token) useAppStore.getState().setPendingFamilyInvite(params.token);
  }, [params.token]);

  const accept = async () => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await acceptFamilyInvite(token);
      router.replace(
        useLockStore.getState().pinSet ? '/whos-watching' : '/(onboarding)/pin-setup',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This invitation could not be accepted.');
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) return null;
  return (
    <ScreenContainer style={styles.root}>
      <View style={styles.card}>
        <Txt size={48} center>👨‍👩‍👧</Txt>
        <Txt weight="black" size={24} center>Join this LittleLoop family</Txt>
        <Txt size={14} color={colors.muted} center lineHeight={21}>
          You’ll be able to manage child settings, time limits, and approved videos. The main caregiver keeps control of profile deletion, invitations, and billing.
        </Txt>
        {error ? <Txt weight="bold" size={13} color={colors.red} center>{error}</Txt> : null}
        {!token ? (
          <Txt weight="bold" size={13} color={colors.red} center>This invitation link is incomplete.</Txt>
        ) : isSignedIn ? (
          <Button title="Accept invitation" onPress={accept} loading={busy} />
        ) : (
          <Button title="Sign in to continue" onPress={() => router.push('/(auth)/sign-in')} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  card: { gap: 18, paddingVertical: 24 },
});

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenContainer, Txt } from '@/components';
import { acceptFamilyInvite } from '@/features/family/familyApi';
import { ApiError } from '@/lib/api';
import { useAuthStatus } from '@/lib/auth';
import { syncCurrentUser } from '@/lib/userSync';
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
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (params.token) useAppStore.getState().setPendingFamilyInvite(params.token);
  }, [params.token]);

  const accept = async () => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      // This route can be reached immediately after Clerk activates a new
      // session, before the root auth bridge has finished creating the API
      // user row required by authenticated family endpoints.
      await syncCurrentUser();
      await acceptFamilyInvite(token);
      router.replace(
        useLockStore.getState().pinSet ? '/whos-watching' : '/(onboarding)/pin-setup',
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'INVITE_NOT_FOUND') {
        if (useAppStore.getState().pendingFamilyInvite === token) {
          useAppStore.getState().setPendingFamilyInvite(null);
        }
        setInvalid(true);
      }
      setError(cause instanceof Error ? cause.message : 'This invitation could not be accepted.');
    } finally {
      setBusy(false);
    }
  };

  const leaveInvitation = () => {
    useAppStore.getState().setPendingFamilyInvite(null);
    router.replace('/');
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
        ) : isSignedIn && !invalid ? (
          <Button title="Accept invitation" onPress={accept} loading={busy} />
        ) : !isSignedIn && !invalid ? (
          <Button title="Sign in to continue" onPress={() => router.push('/(auth)/sign-in')} />
        ) : null}
        <Button
          title={invalid || !token ? 'Leave invitation' : 'Not now'}
          variant="outline"
          onPress={leaveInvitation}
          disabled={busy}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  card: { gap: 18, paddingVertical: 24 },
});

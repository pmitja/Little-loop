import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useClerk } from '@clerk/clerk-expo';
import { api, apiConfigured } from '@/lib/api';
import { clerkEnabled } from '@/lib/auth';
import { clearPin } from '@/lib/pin';
import { useAppStore } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { todayKey, useTimerStore } from '@/stores/timerStore';

/**
 * Account deletion (Apple requirement, PLAN Phase 5). Deletes the account
 * server-side (Neon rows + Clerk user via DELETE /users), then wipes
 * everything local — profiles, playlists, watch history, PIN, cached
 * entitlement — and signs out. Purchases are restorable through the store.
 */
export function useDeleteAccount(): () => void {
  const router = useRouter();
  // Stable conditional hook: clerkEnabled never changes at runtime.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerk = clerkEnabled ? useClerk() : null;

  const wipe = async () => {
    if (clerkEnabled && apiConfigured()) {
      try {
        await api('/users', { method: 'DELETE' });
      } catch {
        Alert.alert(
          "Couldn't delete your account",
          'The server could not be reached. Check your connection and try again.',
        );
        return;
      }
    }
    await clearPin();
    useAppStore.setState({
      onboardingComplete: false,
      activeChildProfileId: null,
      childProfiles: [],
    });
    usePlaylistStore.setState({ videosByChild: {} });
    useTimerStore.setState({
      dateKey: todayKey(),
      secondsByChild: {},
      sessions: [],
      activeSessionId: null,
    });
    useLockStore.setState({
      pinSet: false,
      biometricEnabled: false,
      childMode: { active: false, enteredAt: null },
      failedAttempts: 0,
      lockoutUntil: null,
    });
    useEntitlementStore.setState({ premium: false, updatedAt: null });
    await clerk?.signOut().catch(() => {});
    router.replace('/');
  };

  return () => {
    Alert.alert(
      'Delete account & data?',
      'This permanently removes all child profiles, playlists, and watch history from this device and signs you out. Active subscriptions are managed in your store account and can be restored after reinstalling.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'There is no way to undo this.', [
              { text: 'Keep my data', style: 'cancel' },
              { text: 'Delete everything', style: 'destructive', onPress: () => void wipe() },
            ]),
        },
      ],
    );
  };
}

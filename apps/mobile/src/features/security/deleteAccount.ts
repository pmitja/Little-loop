import { useRouter } from 'expo-router';
import { api, apiConfigured } from '@/lib/api';
import { authConfigured } from '@/lib/auth';
import { authClient } from '@/lib/authClient';
import { clearPin } from '@/lib/pin';
import { useAppStore } from '@/stores/appStore';
import { useLockStore } from '@/stores/lockStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { todayKey, useTimerStore } from '@/stores/timerStore';
import { showAppAlert } from '@/components';

/**
 * Account deletion (Apple requirement, PLAN Phase 5). Deletes the account
 * server-side (Neon rows + better-auth user via DELETE /users, which cascades
 * from the auth identity), then wipes everything local — profiles, playlists,
 * watch history, PIN, cached entitlement — and signs out. Purchases are
 * restorable through the store.
 */
export function useDeleteAccount(): () => void {
  const router = useRouter();
  const isOwner = useAppStore((state) => state.familyRole !== 'caregiver');

  const wipe = async () => {
    if (authConfigured && apiConfigured()) {
      try {
        await api('/users', { method: 'DELETE' });
      } catch {
        showAppAlert(
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
      familyRole: null,
      pendingFamilyInvite: null,
    });
    usePlaylistStore.setState({ videosByChild: {}, playlistIdByChild: {} });
    useTimerStore.setState({
      dateKey: todayKey(),
      secondsByChild: {},
      sessions: [],
      activeSessionId: null,
    });
    useLockStore.setState({
      pinSet: false,
      childMode: { active: false, enteredAt: null },
      failedAttempts: 0,
      lockoutUntil: null,
    });
    useEntitlementStore.getState().clearPremium();
    if (authConfigured) await authClient.signOut().catch(() => {});
    router.replace('/');
  };

  return () => {
    showAppAlert(
      'Delete account & data?',
      isOwner
        ? 'This permanently removes the family, all child profiles, playlists, and watch history, then signs you out. Active subscriptions must still be cancelled in your store account.'
        : 'This permanently removes your caregiver access and your account, clears LittleLoop from this device, and signs you out. The family’s profiles and playlists will remain with the main caregiver.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            showAppAlert('Are you sure?', 'There is no way to undo this.', [
              { text: 'Keep my data', style: 'cancel' },
              { text: 'Delete everything', style: 'destructive', onPress: () => void wipe() },
            ]),
        },
      ],
    );
  };
}

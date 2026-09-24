import { clearPin } from '@/lib/pin';
import { useAppStore } from '@/stores/appStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useRequestStore } from '@/stores/requestStore';
import { todayKey, useTimerStore } from '@/stores/timerStore';

/**
 * Forget everything this device holds for the signed-in account — profiles,
 * playlists, requests, watch history, PIN, cached entitlement — so the next
 * account to sign in starts clean. Server data is untouched.
 */
export async function clearLocalAccountData(): Promise<void> {
  await clearPin();
  useAppStore.setState({
    onboardingComplete: false,
    activeChildProfileId: null,
    childProfiles: [],
    childRules: {},
    familyRole: null,
    pendingFamilyInvite: null,
  });
  usePlaylistStore.setState({ videosByChild: {}, playlistIdByChild: {}, playbackProgressByChild: {} });
  useRequestStore.setState({ requestsByChild: {}, likedByChild: {} });
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
}

import { useRouter } from 'expo-router';
import { authConfigured } from '@/lib/auth';
import { authClient } from '@/lib/authClient';
import { showAppAlert } from '@/components';
import { syncCompletedWatchSessions } from '@/features/family/watchSessionSync';
import { useTimerStore } from '@/stores/timerStore';
import { clearLocalAccountData } from './localAccountData';

/**
 * Settings → Sign out. Everything lives on the account, so this only clears
 * the device: signing back in restores profiles, playlists and settings. The
 * PIN is per device and is set again after the next sign-in.
 */
export function useSignOut(): () => void {
  const router = useRouter();

  const signOut = async () => {
    try {
      // Hand any finished watch time to the server before the session goes.
      await syncCompletedWatchSessions(useTimerStore.getState().sessions).catch(() => {});
      if (authConfigured) {
        const { error } = await authClient.signOut();
        if (error) throw new Error(error.message ?? 'Sign-out failed');
      }
      await clearLocalAccountData();
      router.replace('/');
    } catch {
      showAppAlert(
        'Couldn’t sign out',
        'Check your connection and try again.',
        undefined,
        'warning',
      );
    }
  };

  return () => {
    showAppAlert(
      'Sign out?',
      'Your children, videos and settings stay saved to your account. Sign back in any time to pick up where you left off.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ],
    );
  };
}

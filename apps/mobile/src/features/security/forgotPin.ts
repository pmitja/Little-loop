import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useClerk } from '@clerk/clerk-expo';
import { clerkEnabled } from '@/lib/auth';
import { clearPin } from '@/lib/pin';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

/**
 * Forgot-PIN per PLAN §11, parent-weighted because a child can tap it: the
 * reset always signs the account out, so getting back in requires the parent's
 * Clerk credentials before a new PIN can be set. The PIN itself is never
 * displayed or recoverable. (The server reset-confirm step joins with the API.)
 */
export function useForgotPin(): () => void {
  const router = useRouter();
  // clerkEnabled is constant for the app's lifetime, so the conditional hook
  // call is stable across renders (same pattern as useAuthStatus).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerk = clerkEnabled ? useClerk() : null;

  return () => {
    Alert.alert(
      'Reset Parent PIN?',
      clerkEnabled
        ? 'This removes the PIN and signs you out. To set a new PIN you must sign back in with your parent email — a child cannot complete this step.'
        : 'This removes the PIN. You will be asked to create a new one at the sign-in step.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & sign out',
          style: 'destructive',
          onPress: async () => {
            const timer = useTimerStore.getState();
            if (timer.activeSessionId) timer.endSession('parent_exit');
            await clearPin();
            const lock = useLockStore.getState();
            lock.setPinSet(false);
            lock.resetAttempts();
            lock.setChildMode(false);
            await clerk?.signOut().catch(() => {});
            // Splash re-routes: signed out → auth; dev bypass → PIN setup.
            router.replace('/');
          },
        },
      ],
    );
  };
}

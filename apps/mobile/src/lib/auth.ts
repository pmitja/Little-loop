import { useAuth } from '@clerk/clerk-expo';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
export const clerkEnabled = CLERK_PUBLISHABLE_KEY.length > 0;

interface AuthStatus {
  isLoaded: boolean;
  isSignedIn: boolean;
}

/**
 * Clerk auth status, with a dev bypass when no publishable key is configured
 * (lets the first-run flow be exercised before the Clerk project is wired).
 * `clerkEnabled` is constant for the app's lifetime, so the conditional hook
 * call is stable across renders.
 */
export function useAuthStatus(): AuthStatus {
  if (!clerkEnabled) {
    return { isLoaded: true, isSignedIn: true };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isLoaded, isSignedIn } = useAuth();
  return { isLoaded, isSignedIn: isSignedIn ?? false };
}

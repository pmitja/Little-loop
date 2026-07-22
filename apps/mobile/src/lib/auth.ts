import { authClient, authConfigured } from '@/lib/authClient';

export { authConfigured };

interface AuthStatus {
  isLoaded: boolean;
  isSignedIn: boolean;
}

/**
 * better-auth session status, with a dev bypass when no auth backend is
 * configured (lets the first-run flow be exercised without a live server).
 * `authConfigured` is constant for the app's lifetime, so the conditional hook
 * call is stable across renders.
 */
export function useAuthStatus(): AuthStatus {
  if (!authConfigured) {
    return { isLoaded: true, isSignedIn: true };
  }
  const { data, isPending } = authClient.useSession();
  return { isLoaded: !isPending, isSignedIn: Boolean(data?.session) };
}

/**
 * Signed-in parent's display identity, with the same dev bypass as
 * `useAuthStatus`.
 */
export function useParentIdentity(): { name: string | null; email: string | null } {
  if (!authConfigured) {
    return { name: null, email: null };
  }
  const { data } = authClient.useSession();
  const fullName = data?.user?.name ?? '';
  return {
    name: fullName ? (fullName.split(' ')[0] ?? null) : null,
    email: data?.user?.email ?? null,
  };
}

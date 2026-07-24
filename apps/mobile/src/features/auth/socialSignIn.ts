import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authClient } from '@/lib/authClient';
import type { SocialProvider } from '@/features/auth/SocialButton';

/**
 * Apple sign-in is offered on iOS only. That is enough for App Store guideline
 * 4.8, which requires an Apple option wherever a third-party login (our Google
 * button) is offered — it does not apply to the Play build.
 */
export const APPLE_SIGN_IN_ENABLED = Platform.OS === 'ios';

export interface SocialSignInResult {
  /** True once a session exists; the caller may navigate. */
  ok: boolean;
  /** User dismissed the Apple sheet — show nothing, not an error. */
  canceled?: boolean;
  /** Message to surface when `ok` is false and `canceled` is not set. */
  error?: string;
}

function providerLabel(provider: SocialProvider): string {
  return provider === 'apple' ? 'Apple' : 'Google';
}

function isUserCancellation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED';
}

/**
 * Sign in (and, for a first-time user, sign up — social-only means the two are
 * the same server call) with a social provider.
 *
 * Google goes through the browser: the expo plugin opens the consent screen and
 * deep-links back via the `littleloop://` scheme. Apple on iOS uses the native
 * system sheet instead and hands better-auth the resulting identity token, so
 * the parent never leaves the app.
 *
 * Note that Apple returns the full name only on the very first authorization,
 * and the identity token never carries it, so Apple accounts land without a
 * display name. `useParentIdentity` already treats that as null.
 */
export async function signInWithProvider(
  provider: SocialProvider,
): Promise<SocialSignInResult> {
  try {
    if (provider === 'apple' && Platform.OS === 'ios') {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return { ok: false, error: 'Apple didn’t return a sign-in token.' };
      }
      // No nonce: the native sheet embeds a hash of it, while better-auth
      // compares the raw value, so passing one would fail verification. The
      // token is still verified against Apple's keys and our bundle id.
      const { error } = await authClient.signIn.social({
        provider: 'apple',
        idToken: { token: credential.identityToken },
      });
      if (error) return { ok: false, error: error.message ?? 'Couldn’t continue with Apple.' };
      return { ok: true };
    }

    const { error } = await authClient.signIn.social({ provider, callbackURL: '/' });
    if (error) {
      return { ok: false, error: error.message ?? `Couldn’t continue with ${providerLabel(provider)}.` };
    }
    return { ok: true };
  } catch (err) {
    if (isUserCancellation(err)) return { ok: false, canceled: true };
    return { ok: false, error: `Couldn’t continue with ${providerLabel(provider)}.` };
  }
}

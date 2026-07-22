import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

/**
 * better-auth client for the mobile app. Social sign-in opens the provider in a
 * web browser; the `expo` plugin stores the resulting session in SecureStore and
 * deep-links back via the `littleloop://` scheme.
 *
 * `EXPO_PUBLIC_API_URL` carries the `/api/v1` REST prefix the app's own client
 * uses; better-auth mounts at `<root>/api/auth`, so strip the versioned suffix
 * to get the server root it expects as `baseURL`.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
export const AUTH_BASE_URL = API_URL.replace(/\/api\/v1\/?$/, '');

/** Whether a real auth backend is wired — false enables the local dev bypass. */
export const authConfigured = AUTH_BASE_URL.length > 0;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [
    // better-auth 1.6.24's expo client plugin type doesn't structurally satisfy
    // BetterAuthClientPlugin (a $fetch-variance quirk in `getActions`); it works
    // at runtime. Suppress the assignability error rather than cast the plugin —
    // casting collapses useSession's inference to `never`. Drop when upstream
    // types are fixed.
    // @ts-expect-error — see above
    expoClient({
      scheme: 'littleloop',
      storagePrefix: 'littleloop',
      storage: SecureStore,
    }),
  ],
});

/**
 * The expo plugin's stored session cookie, for attaching to requests against
 * the separate REST API. Typed accessor around the plugin's runtime `getCookie`
 * action (not surfaced on the client type once the plugin is cast above).
 */
export function getSessionCookie(): string | null {
  return (authClient as unknown as { getCookie: () => string }).getCookie() || null;
}

import { authAccount, authSession, authUser, authVerification, getDb } from '@littleloop/db';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

/**
 * better-auth instance backing every /api/auth/* route (social sign-in) and the
 * session check in `requireAuth`. Social-only for now — Google is live, Apple
 * lands once the Apple Services ID + signing key exist.
 *
 * The mobile app authenticates through the `expo` plugin: it opens the Google
 * consent screen in a web browser, better-auth completes the OAuth handshake on
 * the server, then deep-links back into the app via the `littleloop://` scheme.
 * `trustedOrigins` must include that scheme (and Expo's dev schemes) or the
 * redirect back is rejected.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
  plugins: [expo()],
  trustedOrigins: [
    'littleloop://',
    ...(process.env.NODE_ENV === 'development' ? ['exp://', 'exp://**'] : []),
  ],
});

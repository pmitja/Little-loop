import { authAccount, authSession, authUser, authVerification, getDb } from '@littleloop/db';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { importPKCS8, SignJWT } from 'jose';

/**
 * better-auth instance backing every /api/auth/* route (social sign-in) and the
 * session check in `requireAuth`. Social-only: Google and Apple. Offering Apple
 * is not optional on iOS — App Store guideline 4.8 requires it alongside any
 * other third-party login.
 *
 * Google authenticates through the `expo` plugin: the app opens the consent
 * screen in a web browser, better-auth completes the OAuth handshake on the
 * server, then deep-links back into the app via the `littleloop://` scheme.
 * `trustedOrigins` must include that scheme (and Expo's dev schemes) or the
 * redirect back is rejected.
 *
 * Apple takes a different route on iOS: the app uses the native
 * `expo-apple-authentication` sheet and posts the resulting identity token to
 * `signIn.social({ idToken })`. That token's audience is the *bundle id*, not
 * the Services ID, which is why `appBundleIdentifier` must be set — without it
 * better-auth rejects the token as having the wrong audience.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const applePrivateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const appleBundleId = process.env.APPLE_APP_BUNDLE_IDENTIFIER;
const appleConfigured = Boolean(
  appleClientId && appleTeamId && appleKeyId && applePrivateKey && appleBundleId,
);

/**
 * Apple has no static client secret: it is an ES256 JWT signed with the .p8
 * key, valid for at most six months. better-auth resolves this async factory
 * when it needs the provider, so the token is minted fresh rather than pasted
 * into an env var that would silently expire and break every Apple sign-in.
 */
async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(applePrivateKey as string, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: appleKeyId as string })
    .setIssuer(appleTeamId as string)
    .setSubject(appleClientId as string)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

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
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {}),
    ...(appleConfigured
      ? {
          apple: async () => ({
            clientId: appleClientId as string,
            clientSecret: await appleClientSecret(),
            appBundleIdentifier: appleBundleId as string,
          }),
        }
      : {}),
  },
  plugins: [expo()],
  trustedOrigins: [
    'littleloop://',
    'https://appleid.apple.com',
    ...(process.env.NODE_ENV === 'development' ? ['exp://', 'exp://**'] : []),
  ],
});

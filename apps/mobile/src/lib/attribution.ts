import { Platform } from 'react-native';
import { storage } from '@/lib/storage';

/**
 * Meta (Facebook) ad attribution per the same env-flag dev bypass as
 * monitoring/purchases: no EXPO_PUBLIC_FACEBOOK_APP_ID (or a build without the
 * native module) → every call here is a no-op. Attribution only: no Facebook
 * Login, no share dialog, no Graph API.
 *
 * What is sent is the install, the app session, and the two conversions we buy
 * ads for (a parent signing up, a parent subscribing). No child data of any
 * kind — no names, no profiles, no video titles, no watch time — and no parent
 * email or name either.
 */
const APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const CLIENT_TOKEN = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? '';

const SIGN_UP_LOGGED_KEY = 'littleloop.attribution.signUpLogged';

type FBSDK = typeof import('react-native-fbsdk-next');

function loadFbsdk(): FBSDK | null {
  if (!APP_ID || !CLIENT_TOKEN) return null;
  if (Platform.OS === 'web') return null;
  try {
    return require('react-native-fbsdk-next') as FBSDK;
  } catch {
    // Native module absent (Expo Go, or a build made without the credentials).
    return null;
  }
}

const fbsdk = loadFbsdk();
export const attributionEnabled = fbsdk !== null;

let initialized = false;

/**
 * Ask for App Tracking Transparency (iOS 14.5+) and start the SDK with the
 * answer. Safe to call more than once — only the first call does anything, so
 * a remount can't re-prompt.
 *
 * The SDK is initialized either way: denied tracking still allows aggregated,
 * non-IDFA attribution (Meta's SKAdNetwork/AEM path), which is the only thing
 * most installs will contribute.
 */
export async function initAttribution(): Promise<void> {
  if (!fbsdk || initialized) return;
  initialized = true;

  let trackingAllowed = Platform.OS !== 'ios';
  if (Platform.OS === 'ios') {
    try {
      const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
      const { granted } = await requestTrackingPermissionsAsync();
      trackingAllowed = granted;
    } catch {
      // No ATT module or the prompt failed — stay on the conservative default.
      trackingAllowed = false;
    }
  }

  const { Settings } = fbsdk;
  Settings.setAppID(APP_ID);
  Settings.setClientToken(CLIENT_TOKEN);
  // Both must be false when the parent said no, or the SDK will attach the
  // device advertising id to events anyway.
  Settings.setAdvertiserTrackingEnabled(trackingAllowed);
  Settings.setAdvertiserIDCollectionEnabled(trackingAllowed);
  Settings.initializeSDK();
}

/**
 * Ties events to our better-auth user id, so a conversion on a second device
 * isn't counted as a second customer. Pass null on sign-out.
 */
export function setAttributionUser(userId: string | null): void {
  if (!fbsdk || !initialized) return;
  const { AppEventsLogger } = fbsdk;
  if (userId) AppEventsLogger.setUserID(userId);
  else AppEventsLogger.clearUserID();
}

/**
 * First successful sign-in on this install. Social-only auth makes sign-up and
 * sign-in the same call, so the install-scoped flag is what keeps a returning
 * parent from being counted as a new registration on every launch.
 */
export async function logSignUp(): Promise<void> {
  if (!fbsdk || !initialized) return;
  if (await storage.getItem(SIGN_UP_LOGGED_KEY)) return;
  await storage.setItem(SIGN_UP_LOGGED_KEY, '1');
  fbsdk.AppEventsLogger.logEvent('fb_mobile_complete_registration', {
    fb_registration_method: 'social',
  });
}

/** A completed subscription purchase — the conversion campaigns optimize for. */
export function logSubscription(amount: number, currency: string, productId: string): void {
  if (!fbsdk || !initialized) return;
  if (!Number.isFinite(amount) || amount <= 0 || !currency) return;
  const { AppEventsLogger } = fbsdk;
  AppEventsLogger.logPurchase(amount, currency, { fb_content_id: productId });
  AppEventsLogger.logEvent('Subscribe', amount, { fb_content_id: productId, fb_currency: currency });
  // Purchases are worth the immediate round trip; the SDK otherwise batches.
  AppEventsLogger.flush();
}

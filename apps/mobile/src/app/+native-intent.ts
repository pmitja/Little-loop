import { getShareExtensionKey } from 'expo-share-intent';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';

/**
 * iOS opens the app from the Share Extension via our scheme, carrying the shared
 * payload behind a generated key rather than as a readable path. Expo Router would
 * treat that as an unknown route and land on the 404, so rewrite it to the parent
 * PIN gate. The gate exits Child Mode, establishes the parent navigation stack,
 * and then opens the screen that reads the intent.
 *
 * Android needs nothing here: the intent is delivered to MainActivity and the
 * native module surfaces it through ShareIntentProvider instead of a URL.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return '/pin-unlock?next=%2Fshare-video';
    }
    // littleloop://pair?code=123456 — a parent phone's camera scanned the QR a
    // kid device is showing. Claiming is a parent action, so it goes through
    // the PIN gate. A kid device opening the link just stays on its videos.
    const pair = /^\/?pair\?(?:.*&)?code=(\d{6})/.exec(path.replace(/^littleloop:\/\//, ''));
    if (pair) {
      if (useKidDeviceStore.getState().paired) return '/';
      const next = `/(parent)/pair-kid-device?code=${pair[1]}`;
      return `/pin-unlock?next=${encodeURIComponent(next)}`;
    }
    return path;
  } catch {
    return '/';
  }
}

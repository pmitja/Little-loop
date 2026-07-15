import { getShareExtensionKey } from 'expo-share-intent';

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
    return path;
  } catch {
    return '/';
  }
}

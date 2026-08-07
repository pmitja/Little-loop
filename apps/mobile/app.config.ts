import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json stays the static source of truth; this file only appends the config
 * plugins whose values come from the environment. The Meta SDK is wired for ad
 * attribution only (no Facebook Login), and only when both credentials are
 * present — a build without them ships no Meta code paths at all, which is what
 * every local and preview build gets by default.
 */
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const FACEBOOK_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? '';

const USER_TRACKING_PERMISSION =
  'Lets LittleLoop see which ad brought you here, so we can stop paying for the ones that don’t. Never your child’s viewing.';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];

  if (FACEBOOK_APP_ID && FACEBOOK_CLIENT_TOKEN) {
    plugins.push(
      [
        'react-native-fbsdk-next',
        {
          appID: FACEBOOK_APP_ID,
          clientToken: FACEBOOK_CLIENT_TOKEN,
          displayName: 'LittleLoop',
          // Nothing starts before the parent has answered the ATT prompt —
          // initAttribution() in src/lib/attribution.ts owns the init call.
          isAutoInitEnabled: false,
          autoLogAppEventsEnabled: true,
          // Permission to read the IDFA/GAID at all; the runtime still gates
          // the actual advertiser-tracking flag on the ATT answer.
          advertiserIDCollectionEnabled: true,
          // The usage string is owned by expo-tracking-transparency below, so
          // the two plugins can't write conflicting Info.plist entries.
          iosUserTrackingPermission: false,
        },
      ],
      ['expo-tracking-transparency', { userTrackingPermission: USER_TRACKING_PERMISSION }],
    );
  }

  return { ...config, name: config.name ?? 'LittleLoop', slug: config.slug ?? 'littleloop', plugins };
};

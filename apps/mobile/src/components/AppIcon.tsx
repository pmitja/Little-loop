import { Image } from 'expo-image';
import { type StyleProp, type ImageStyle } from 'react-native';

export type AppIconName =
  | 'profile'
  | 'time'
  | 'videos'
  | 'pin'
  | 'premium'
  | 'restore'
  | 'privacy'
  | 'terms'
  | 'delete'
  | 'home'
  | 'settings'
  | 'channels'
  | 'add-video'
  | 'parent-hq'
  | 'weekend'
  | 'warning';

const ICONS: Record<AppIconName, number> = {
  profile: require('../../assets/images/icons/profile.png'),
  time: require('../../assets/images/icons/time.png'),
  videos: require('../../assets/images/icons/videos.png'),
  pin: require('../../assets/images/icons/pin.png'),
  premium: require('../../assets/images/icons/premium.png'),
  restore: require('../../assets/images/icons/restore.png'),
  privacy: require('../../assets/images/icons/privacy.png'),
  terms: require('../../assets/images/icons/terms.png'),
  delete: require('../../assets/images/icons/delete.png'),
  home: require('../../assets/images/icons/home.png'),
  settings: require('../../assets/images/icons/settings.png'),
  channels: require('../../assets/images/icons/channels.png'),
  'add-video': require('../../assets/images/icons/add-video.png'),
  'parent-hq': require('../../assets/images/icons/parent-hq.png'),
  weekend: require('../../assets/images/icons/weekend.png'),
  warning: require('../../assets/images/icons/warning.png'),
};

/** Decorative icon art; the surrounding row/tab owns the accessible label. */
export function AppIcon({
  name,
  size = 30,
  muted = false,
  style,
}: {
  name: AppIconName;
  size?: number;
  muted?: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ICONS[name]}
      style={[
        { width: size, height: size, opacity: muted ? 0.52 : 1 },
        style,
      ]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={120}
      accessible={false}
    />
  );
}

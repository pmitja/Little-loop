import { Image } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

export type StoryScene = 'welcome' | 'pin-safe' | 'add-video';

const ART: Record<StoryScene, number> = {
  welcome: require('../../assets/images/characters/welcome.png'),
  'pin-safe': require('../../assets/images/characters/pin-safe.png'),
  'add-video': require('../../assets/images/characters/add-video.png'),
};

const LABELS: Record<StoryScene, string> = {
  welcome: 'Friendly bear and fox with a play button',
  'pin-safe': 'Friendly bear protecting a shield',
  'add-video': 'Friendly bunny holding an add-video card',
};

export function StoryIllustration({
  scene,
  width = 220,
  style,
}: {
  scene: StoryScene;
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ART[scene]}
      accessibilityLabel={LABELS[scene]}
      style={[styles.image, { width, height: width * (896 / 1200) }, style]}
      contentFit="cover"
      transition={160}
    />
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 28, backgroundColor: '#FFF1E4' },
});

import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const ART = require('../../../assets/images/characters/kid-devices.png');

/** Parent phone and child tablet joined by a heart — the kid-device feature art. */
export function KidDevicesArt({
  width = 280,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ART}
      accessibilityLabel="A phone and a tablet connected by a heart"
      style={[styles.image, { width, height: width * (2 / 3) }, style]}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' },
});

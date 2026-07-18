import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme/tokens';

const APP_ICON = require('../../assets/images/icon.png');

/** The same LittleLoop mark used by the installed app icon and native splash. */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <View
      style={[
        styles.shadow,
        { width: size, height: size, borderRadius: size * 0.225 },
      ]}
    >
      <Image
        source={APP_ICON}
        style={[styles.image, { borderRadius: size * 0.225 }]}
        contentFit="cover"
        transition={120}
        accessibilityLabel="LittleLoop"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: colors.child.cream,
    shadowColor: '#58B6A9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  image: { width: '100%', height: '100%' },
});

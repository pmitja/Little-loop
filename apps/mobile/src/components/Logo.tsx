import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

/** App mark: blue gradient rounded square with a play ring (s01). */
export function Logo({ size = 96 }: { size?: number }) {
  const ring = size * 0.54;
  return (
    <LinearGradient
      colors={['#6FBBFB', '#4A9FF0']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.354,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4,
        shadowRadius: 34,
        elevation: 10,
      }}
    >
      <View style={{ width: ring, height: ring }}>
        <Svg width={ring} height={ring} viewBox="0 0 52 52">
          <Circle cx={26} cy={26} r={23} stroke="rgba(255,255,255,.95)" strokeWidth={5} fill="none" />
          <Path d="M21 16 L37 26 L21 36 Z" fill="#FFFFFF" />
        </Svg>
      </View>
    </LinearGradient>
  );
}

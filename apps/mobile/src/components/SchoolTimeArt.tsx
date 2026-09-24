import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const ART = require('../../assets/images/characters/school-time.png');
const ASPECT = 564 / 600;
/** Where the bell hangs in the art, as a fraction of its width/height. */
const BELL = { x: 0.43, y: 0.21 };
const RING_EVERY_MS = 3600;

const ease = Easing.inOut(Easing.quad);

/** Two little strokes either side of the bell — the "ding". */
function DingMarks({ size, flip }: { size: number; flip?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={flip ? styles.flip : undefined}>
      <Path d="M8 5 L3 2 M9 11 L2 11 M8 17 L3 20" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * The school-time break art. The schoolhouse floats gently and, every few
 * seconds, its bell rings — a small rock of the whole house with "ding"
 * marks — so the screen feels alive while the videos are away.
 * Reduced motion keeps it still.
 */
export function SchoolTimeArt({ width = 220 }: { width?: number }) {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);
  const ring = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      float.value = 0;
      ring.value = 0;
      glow.value = 0;
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 1800, easing: ease }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 2400, easing: ease }), -1, true);
    const swing = (to: number) => withTiming(to, { duration: 110, easing: ease });
    ring.value = withRepeat(
      withDelay(
        RING_EVERY_MS - 900,
        withSequence(swing(1), swing(-1), swing(0.8), swing(-0.8), swing(0.4), swing(-0.3), swing(0)),
      ),
      -1,
    );
  }, [reducedMotion, float, ring, glow]);

  const houseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * float.value }, { rotate: `${4 * ring.value}deg` }],
  }));
  const dingStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(ring.value) * 1.6),
    transform: [{ scale: 0.8 + 0.3 * Math.abs(ring.value) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * glow.value,
    transform: [{ scale: 0.94 + 0.08 * glow.value }],
  }));

  const height = width * ASPECT;
  const ding = width * 0.16;

  return (
    <View style={[styles.stage, { width: width * 1.2, height: height * 1.15 }]} accessible={false}>
      <Animated.View style={[styles.glow, { width: width * 1.12, height: width * 1.12, borderRadius: width }, glowStyle]} />
      <Animated.View style={[{ width, height }, houseStyle]}>
        <Image source={ART} style={{ width, height }} contentFit="contain" accessible={false} />
        <Animated.View
          style={[styles.ding, { left: width * BELL.x - ding * 1.9, top: height * BELL.y - ding / 2 }, dingStyle]}
        >
          <DingMarks size={ding} />
        </Animated.View>
        <Animated.View
          style={[styles.ding, { left: width * BELL.x + ding * 0.9, top: height * BELL.y - ding / 2 }, dingStyle]}
        >
          <DingMarks size={ding} flip />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: 'rgba(255,255,255,.22)' },
  ding: { position: 'absolute' },
  flip: { transform: [{ scaleX: -1 }] },
});

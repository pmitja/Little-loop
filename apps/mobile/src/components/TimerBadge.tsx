import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';
import { AppIcon } from './AppIcon';

interface TimerBadgeProps {
  /** Seconds remaining today; null = no daily limit. */
  remainingSeconds: number | null;
  /** Full daily allowance in seconds — drives the progress bar fill (light variant). */
  totalSeconds?: number | null;
  /** Full meter on the library; compact light/dark pills in the player. */
  variant?: 'light' | 'compact' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function timerLabel(remaining: number | null): string {
  if (remaining === null) return 'No limit today';
  const minutes = Math.ceil(remaining / 60);
  if (remaining <= 0) return 'Time is up';
  return `${minutes} min left`;
}

/**
 * Child-home time meter (concept §01): white pill · ⏰ · grass→sun gradient bar
 * showing time left · label. Pulses once remaining ≤ 2 minutes (PLAN §13).
 */
export function TimerBadge({ remainingSeconds, totalSeconds, variant = 'light', style }: TimerBadgeProps) {
  const warning = remainingSeconds !== null && remainingSeconds <= 120;
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (warning && !reducedMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 500 }), withTiming(1, { duration: 500 })),
        2,
      );
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [warning, reducedMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (variant === 'dark') {
    return (
      <Animated.View style={[styles.pill, styles.dark, animatedStyle, style]}>
        <AppIcon name="time" size={18} />
        <Txt weight="extrabold" size={13.5} color={warning ? colors.child.coral : colors.child.sun}>
          {timerLabel(remainingSeconds)}
        </Txt>
      </Animated.View>
    );
  }

  if (variant === 'compact') {
    return (
      <Animated.View
        accessibilityRole="text"
        accessibilityLabel={timerLabel(remainingSeconds)}
        style={[styles.pill, styles.compact, shadows.card, animatedStyle, style]}
      >
        <AppIcon name="time" size={18} />
        <Txt weight="extrabold" size={13.5} color={warning ? colors.child.coral : colors.parent.night}>
          {timerLabel(remainingSeconds)}
        </Txt>
      </Animated.View>
    );
  }

  const fraction =
    remainingSeconds !== null && totalSeconds && totalSeconds > 0
      ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds))
      : 1;

  return (
    <Animated.View style={[styles.pill, styles.light, shadows.card, animatedStyle, style]}>
      <AppIcon name="time" size={19} />
      <View style={styles.track}>
        <LinearGradient
          colors={warning ? [colors.child.coral, colors.child.coral] : [colors.child.grass, colors.child.sun]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${fraction * 100}%` }]}
        />
      </View>
      <Txt weight="extrabold" size={13} color={warning ? colors.child.coral : colors.parent.night}>
        {timerLabel(remainingSeconds)}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  light: { backgroundColor: 'rgba(255,255,255,.92)', alignSelf: 'stretch' },
  compact: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', gap: 6 },
  dark: { backgroundColor: 'rgba(255,255,255,.12)', alignSelf: 'flex-start', gap: 5 },
  track: { flex: 1, height: 8, borderRadius: 99, backgroundColor: '#E8E0D0', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
});

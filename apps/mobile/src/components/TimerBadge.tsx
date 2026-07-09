import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface TimerBadgeProps {
  /** Seconds remaining today; null = no daily limit. */
  remainingSeconds: number | null;
  /** 'light' — white pill on child home (s13); 'dark' — translucent pill on the player (s14). */
  variant?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function timerLabel(remaining: number | null): string {
  if (remaining === null) return 'No limit today';
  const minutes = Math.ceil(remaining / 60);
  if (remaining <= 0) return 'Time is up';
  if (remaining <= 120) return `${minutes} min left!`;
  return `${minutes} minutes left`;
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={5.75} stroke={color} strokeWidth={2.5} fill="none" />
      <Path d="M7 4.2 V7 L8.8 8.6" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Amber time-remaining pill (s13/s14); pulses once remaining ≤ 2 minutes (PLAN §13). */
export function TimerBadge({ remainingSeconds, variant = 'light', style }: TimerBadgeProps) {
  const warning = remainingSeconds !== null && remainingSeconds <= 120;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (warning) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
      );
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [warning, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const iconColor = variant === 'dark' ? colors.amberDark : colors.amber;
  const textColor = variant === 'dark' ? colors.amberDark : colors.amberText;

  return (
    <Animated.View
      style={[
        styles.pill,
        variant === 'dark' ? styles.dark : [styles.light, shadows.card],
        warning ? styles.warning : null,
        animatedStyle,
        style,
      ]}
    >
      <ClockIcon color={warning ? '#FFFFFF' : iconColor} />
      <Txt weight="extrabold" size={13.5} color={warning ? '#FFFFFF' : textColor}>
        {timerLabel(remainingSeconds)}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  light: { backgroundColor: colors.card },
  dark: { backgroundColor: 'rgba(255,204,102,.15)' },
  warning: { backgroundColor: colors.amber },
});

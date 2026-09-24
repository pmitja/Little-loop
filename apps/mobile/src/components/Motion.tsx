import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { durations, easings, enterUp, springs } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Haptic = 'light' | 'medium' | 'select' | false;

function fireHaptic(kind: Haptic) {
  if (kind === 'select') void Haptics.selectionAsync();
  else if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (kind === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far the control shrinks while held. Big kid targets squash more. */
  pressedScale?: number;
  /** Fired on press-in so the tap feels physical before the action lands. */
  haptic?: Haptic;
}

/**
 * The app's one pressable surface: springs down while held and back on release,
 * with an optional haptic tick on touch-down.
 */
export function PressableScale({
  children,
  style,
  pressedScale = 0.96,
  haptic = false,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, pressedScale]) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        pressed.value = withSpring(1, springs.press);
        if (!disabled) fireHaptic(haptic);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        pressed.value = withSpring(0, springs.bouncy);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Staggered entrance for a screen's blocks: pass each block its order. */
export function Appear({
  index = 0,
  delay = 0,
  style,
  children,
}: {
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={enterUp(index, delay)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Idle life for character art: a slow bob with a little sway. `phase` offsets
 * the start so neighbouring characters don't move in lockstep.
 */
export function Float({
  children,
  distance = 6,
  sway = 2,
  duration = 2200,
  phase = 0,
  style,
}: {
  children: ReactNode;
  distance?: number;
  /** Degrees of rotation at the top of the bob. */
  sway?: number;
  duration?: number;
  phase?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      t.value = 0;
      return;
    }
    t.value = withDelay(
      phase,
      withRepeat(withTiming(1, { duration, easing: easings.inOut }), -1, true),
    );
  }, [reducedMotion, duration, phase, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -distance * t.value },
      { rotate: `${sway * (t.value - 0.5)}deg` },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** A soft, endless pulse — glows behind art, "live" dots, attention badges. */
export function Breathe({
  children,
  from = 0.94,
  to = 1.04,
  duration = 1600,
  fade = false,
  style,
}: {
  children?: ReactNode;
  from?: number;
  to?: number;
  duration?: number;
  /** Also fade between 55% and 100% opacity. */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      t.value = 0.5;
      return;
    }
    t.value = withRepeat(withTiming(1, { duration, easing: easings.inOut }), -1, true);
  }, [reducedMotion, duration, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade ? 0.55 + 0.45 * t.value : 1,
    transform: [{ scale: from + (to - from) * t.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/**
 * A playful pop-in for icons and characters: scales up from nothing with an
 * overshoot, then (optionally) wiggles every few seconds so the art feels alive.
 */
export function PopIn({
  children,
  delay = 0,
  wiggleEvery = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  /** Milliseconds between idle wiggles; 0 disables them. */
  wiggleEvery?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.4);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(delay, withSpring(1, springs.bouncy));
    if (wiggleEvery > 0) {
      const step = (to: number) => withTiming(to, { duration: 90, easing: easings.inOut });
      tilt.value = withDelay(
        delay + 900,
        withRepeat(
          withSequence(withDelay(wiggleEvery, step(1)), step(-1), step(0.6), step(-0.4), step(0)),
          -1,
        ),
      );
    }
  }, [reducedMotion, delay, wiggleEvery, scale, tilt]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [0.4, 0.7], [0, 1], 'clamp'),
    transform: [{ scale: scale.value }, { rotate: `${6 * tilt.value}deg` }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** Fills a track to `progress` (0–1) with a spring whenever the value changes. */
export function AnimatedFill({
  progress,
  style,
  children,
}: {
  progress: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withSpring(Math.min(1, Math.max(0, progress)), springs.gentle);
  }, [progress, value]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <Animated.View style={[{ height: '100%', overflow: 'hidden' }, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/** Fades content in on mount — for swapped states such as a success message. */
export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: durations.base, easing: easings.out }));
  }, [delay, t]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** A twinkling dot for night skies. */
export function Twinkle({
  size,
  delay = 0,
  style,
}: {
  size: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0.6);
  useEffect(() => {
    if (reducedMotion) return;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1300 + (delay % 700), easing: easings.inOut }), -1, true),
    );
  }, [reducedMotion, delay, t]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * t.value,
    transform: [{ scale: 0.7 + 0.4 * t.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFF3D9' },
        style,
        animatedStyle,
      ]}
    />
  );
}

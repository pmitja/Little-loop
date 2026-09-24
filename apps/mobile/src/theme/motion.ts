import { Easing, FadeInDown, ReduceMotion, type WithSpringConfig } from 'react-native-reanimated';

/**
 * One motion vocabulary for the whole app, so every screen moves the same way.
 *
 * - `press`   quick, tight spring for touch feedback (scale down, settle back)
 * - `snappy`  UI that follows a finger or tap: tabs, toggles, segment thumbs
 * - `bouncy`  the kid carousel and other playful moments (overshoots a touch)
 * - `gentle`  large surfaces: sheets, hero cards, progress fills
 *
 * Every animation honours the system Reduce Motion setting.
 */
export const springs = {
  press: { damping: 18, stiffness: 420, mass: 0.6, reduceMotion: ReduceMotion.System },
  snappy: { damping: 22, stiffness: 260, mass: 0.8, reduceMotion: ReduceMotion.System },
  bouncy: { damping: 13, stiffness: 170, mass: 0.9, reduceMotion: ReduceMotion.System },
  gentle: { damping: 24, stiffness: 120, mass: 1, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

export const durations = {
  fast: 160,
  base: 260,
  slow: 420,
} as const;

export const easings = {
  inOut: Easing.inOut(Easing.quad),
  out: Easing.out(Easing.cubic),
} as const;

/** Delay between siblings in a staggered entrance. */
export const STAGGER_MS = 55;

/** Content entrance: rise 14pt and fade in, staggered by index. */
export function enterUp(index = 0, baseDelay = 0) {
  return FadeInDown.duration(durations.slow)
    .delay(baseDelay + index * STAGGER_MS)
    .springify()
    .damping(20)
    .stiffness(170)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
    .reduceMotion(ReduceMotion.System);
}

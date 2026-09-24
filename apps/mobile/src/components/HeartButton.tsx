import { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Reanimated, { FadeOutDown, ZoomIn } from 'react-native-reanimated';
import type { AvatarId } from '@littleloop/shared';
import { ChildAvatar } from './ChildAvatar';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function Heart({ size, filled, color }: { size: number; filled: boolean; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d={HEART_PATH}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 2.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface HeartButtonProps {
  liked: boolean;
  onToggle: () => void;
  /**
   * 'overlay' = small round chip for a thumbnail; 'chip' = big white 56pt kid
   * target; 'pill' = labelled button for the player.
   */
  variant?: 'overlay' | 'chip' | 'pill';
  /** Diameter of the 'chip' variant. */
  size?: number;
  label?: string;
  likedLabel?: string;
}

/**
 * A big, unmistakable heart a child taps to tell a grown-up "I like this."
 * Fills with a little pop + haptic on like — the whole affordance is one target
 * a 5-year-old can hit (Spotify Kids / Calm favouriting pattern).
 */
export function HeartButton({
  liked,
  onToggle,
  variant = 'overlay',
  label = 'Like',
  likedLabel = 'Liked',
  size = 56,
}: HeartButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    // Liking pops the heart past full size before it settles; unliking just dips.
    scale.setValue(liked ? 0.8 : 0.5);
    Animated.spring(scale, { toValue: 1, friction: 3.2, tension: 160, useNativeDriver: true }).start();
    onToggle();
  }, [liked, onToggle, scale]);

  const color = liked ? colors.child.coral : variant === 'pill' ? colors.child.coral : '#FFFFFF';

  if (variant === 'pill') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={liked ? 'You liked this video' : 'Tell a grown-up you like this video'}
        onPress={handlePress}
        style={({ pressed }) => [styles.pill, liked && styles.pillLiked, pressed && styles.pressed]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Heart size={26} filled={liked} color={color} />
        </Animated.View>
        <Txt weight="black" size={16} color={liked ? colors.child.coral : colors.parent.night}>
          {liked ? likedLabel : label}
        </Txt>
      </Pressable>
    );
  }

  if (variant === 'chip') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={liked ? 'You liked this video' : 'Tell a grown-up you like this video'}
        onPress={handlePress}
        hitSlop={6}
        style={({ pressed }) => [
          styles.chip,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && styles.pressed,
        ]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Heart size={size * 0.5} filled color={liked ? colors.child.coral : '#CFC6D2'} />
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: liked }}
      accessibilityLabel={liked ? 'You liked this video' : 'Tell a grown-up you like this video'}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.overlay, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart size={22} filled={liked} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/** Small floating "Told your grown-up 💛" style confirmation. */
export function LikeToast({ text, avatar }: { text: string; avatar?: AvatarId }) {
  return (
    <Reanimated.View
      pointerEvents="none"
      entering={ZoomIn.springify().damping(14).stiffness(220)}
      exiting={FadeOutDown.duration(220)}
      style={styles.toast}
    >
      {avatar ? <ChildAvatar avatar={avatar} size={30} /> : null}
      <Txt weight="black" size={16} color="#FFFFFF">
        {text}
      </Txt>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20,28,45,.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  pill: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  pillLiked: { backgroundColor: '#FCE7E3' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.parent.night,
    borderRadius: 99,
    paddingVertical: 14,
    paddingHorizontal: 22,
    ...shadows.cardLg,
  },
});

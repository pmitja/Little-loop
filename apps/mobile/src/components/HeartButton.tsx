import { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
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
  /** 'overlay' = round chip for a video thumbnail; 'pill' = big labelled button for the player. */
  variant?: 'overlay' | 'pill';
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
}: HeartButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
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
export function LikeToast({ text }: { text: string }) {
  return (
    <View pointerEvents="none" style={styles.toast}>
      <Txt weight="extrabold" size={15} color="#FFFFFF">
        {text}
      </Txt>
    </View>
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
    backgroundColor: colors.child.coral,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...shadows.cardLg,
  },
});

import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface PINDotsProps {
  length?: number;
  filled: number;
  error?: boolean;
}

/** Row of 16px dots above the keypad (s05); shakes on `error`. */
export function PINDots({ length = 4, filled, error }: PINDotsProps) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(10, { duration: 55 }),
        withTiming(-7, { duration: 55 }),
        withTiming(7, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    }
  }, [error, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View style={[styles.dotsRow, animatedStyle]}>
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isFilled
                ? { backgroundColor: error ? colors.red : colors.primary }
                : { borderWidth: 2.5, borderColor: colors.dotInactive },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

interface PINKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** 3-column keypad of 76px white circles (s05). */
export function PINKeypad({ onDigit, onDelete, disabled }: PINKeypadProps) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key, i) => {
        if (key === '') return <View key={i} style={styles.key} />;
        const isDelete = key === 'del';
        return (
          <Pressable
            key={i}
            disabled={disabled}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              isDelete ? onDelete() : onDigit(key);
            }}
            style={({ pressed }) => [
              styles.key,
              !isDelete && styles.digitKey,
              disabled ? { opacity: 0.45 } : null,
              pressed ? { transform: [{ scale: 0.94 }] } : null,
            ]}
          >
            <Txt
              weight="extrabold"
              size={isDelete ? 20 : 27}
              color={isDelete ? colors.subtle : colors.ink}
              style={!isDelete ? { fontFamily: fonts.extrabold } : null}
            >
              {isDelete ? '⌫' : key}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const KEY_SIZE = 76;

const styles = StyleSheet.create({
  dotsRow: { flexDirection: 'row', gap: 16 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: KEY_SIZE * 3 + 32,
    columnGap: 16,
    rowGap: 16,
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitKey: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
});

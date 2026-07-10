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

interface PINBoxesProps {
  length?: number;
  filled: number;
  error?: boolean;
}

/** Row of bordered PIN boxes above the keypad — same look as the parent unlock gate; shakes on `error`. */
export function PINBoxes({ length = 4, filled, error }: PINBoxesProps) {
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
    <Animated.View style={[styles.boxRow, animatedStyle]}>
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              error && { borderColor: colors.red },
            ]}
          >
            <Txt weight="black" size={18}>
              {isFilled ? '●' : ''}
            </Txt>
          </View>
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

/** 3-column keypad of bordered white rounded-rect keys (concept §03). */
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
              if (isDelete) onDelete();
              else onDigit(key);
            }}
            style={({ pressed }) => [
              styles.key,
              styles.digitKey,
              disabled ? { opacity: 0.45 } : null,
              pressed ? { transform: [{ scale: 0.96 }], backgroundColor: '#F6F1E7' } : null,
            ]}
          >
            <Txt
              weight="extrabold"
              size={isDelete ? 19 : 22}
              color={isDelete ? colors.subtle : colors.parent.night}
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

const KEY_W = 96;
const KEY_H = 58;

const styles = StyleSheet.create({
  boxRow: { flexDirection: 'row', gap: 8 },
  box: {
    width: 40,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.child.skyDeep,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: '#EAF6FA' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: KEY_W * 3 + 20,
    columnGap: 10,
    rowGap: 10,
    justifyContent: 'center',
  },
  key: {
    width: KEY_W,
    height: KEY_H,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitKey: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#E5DCCB',
  },
});

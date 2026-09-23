import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, scaleUi, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface ParentHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Dismisses a modal screen — renders a close (×) button on the trailing edge. */
  onClose?: () => void;
  right?: ReactNode;
}

/** Compact parent-zone header shared by tab roots and detail screens. */
export function ParentHeader({ title, subtitle, onBack, onClose, right }: ParentHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={6}
            style={styles.back}
          >
            <Svg width={scaleUi(16)} height={scaleUi(16)} viewBox="0 0 16 16">
              <Path
                d="M10 3 L5 8 L10 13"
                stroke={colors.ink}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
      ) : null}
      <View style={styles.titles}>
          <Txt weight="black" size={24}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt weight="semibold" size={13.5} color={colors.muted}>
              {subtitle}
            </Txt>
          ) : null}
      </View>
      {right}
      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={6}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Svg width={scaleUi(14)} height={scaleUi(14)} viewBox="0 0 14 14">
            <Path
              d="M2 2 L12 12 M12 2 L2 12"
              stroke={colors.ink}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: scaleUi(44),
    height: scaleUi(44),
    borderRadius: scaleUi(44) / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: { opacity: 0.7 },
  titles: { flex: 1, gap: 2 },
});

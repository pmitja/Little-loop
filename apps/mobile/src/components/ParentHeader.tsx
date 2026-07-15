import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface ParentHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Compact parent-zone header shared by tab roots and detail screens. */
export function ParentHeader({ title, subtitle, onBack, right }: ParentHeaderProps) {
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
            <Svg width={16} height={16} viewBox="0 0 16 16">
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  titles: { flex: 1, gap: 2 },
});

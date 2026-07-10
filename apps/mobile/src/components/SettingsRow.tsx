import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, controls, radii, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface SettingsRowProps {
  icon: ReactNode;
  iconBg: string;
  label?: string;
  title?: string;
  value?: string;
  chevron?: boolean;
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  onPress?: () => void;
  /** Tints the title (e.g. colors.red for destructive rows). */
  titleColor?: string;
}

export function SettingsRow({ icon, iconBg, label, title, value, chevron, toggle, onPress, titleColor }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {typeof icon === 'string' ? <Txt size={15}>{icon}</Txt> : icon}
      </View>
      <Txt weight="extrabold" size={15} color={titleColor} numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
        {title ?? label}
      </Txt>
      {value ? (
        <Txt weight="bold" size={14} color={colors.muted}>
          {value}
        </Txt>
      ) : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.child.grass, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      ) : null}
      {chevron ? (
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d="M5 3 L10 7 L5 11"
            stroke={colors.subtle}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}

/** White card grouping SettingsRows with hairline dividers (s18). */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  iconBox: {
    width: controls.iconSlot,
    height: controls.iconSlot,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, minWidth: 0 },
});

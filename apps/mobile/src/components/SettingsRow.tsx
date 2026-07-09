import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface SettingsRowProps {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value?: string;
  chevron?: boolean;
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  onPress?: () => void;
}

export function SettingsRow({ icon, iconBg, label, value, chevron, toggle, onPress }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <Txt weight="extrabold" size={15} style={{ flex: 1 }}>
        {label}
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
          trackColor={{ true: colors.primary, false: colors.border }}
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
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

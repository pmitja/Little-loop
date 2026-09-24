import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, controls, radii, scaleUi, shadows } from '@/theme/tokens';
import { Txt } from './Txt';
import { PressableScale } from './Motion';

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
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title ?? label}
      onPress={onPress}
      disabled={!onPress}
      pressedScale={0.975}
      style={styles.row}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {typeof icon === 'string' ? <Txt size={15}>{icon}</Txt> : icon}
      </View>
      <Txt weight="extrabold" size={15} color={titleColor} numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
        {title ?? label}
      </Txt>
      {value ? (
        <Txt weight="bold" size={13} color={colors.muted} numberOfLines={1} style={styles.value}>
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
        <Svg width={scaleUi(14)} height={scaleUi(14)} viewBox="0 0 14 14">
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
    </PressableScale>
  );
}

/** White card grouping SettingsRows with hairline dividers (s18). */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
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
    width: controls.iconSlot + 2,
    height: controls.iconSlot + 2,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, minWidth: 0 },
  value: { maxWidth: '42%' },
  divider: { height: 1, backgroundColor: '#F0EBE1' },
});

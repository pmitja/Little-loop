import { Pressable, StyleSheet, View } from 'react-native';
// SDK 57's expo-router vendors react-navigation; the type isn't re-exported publicly.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';

const TABS: Record<string, { label: string; icon: (active: boolean) => React.ReactNode }> = {
  index: {
    label: 'Home',
    icon: (active) => (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Rect
          x={1.5}
          y={1.5}
          width={15}
          height={15}
          rx={5}
          stroke={active ? colors.primary : colors.subtle}
          strokeWidth={2.5}
          fill={active ? colors.primaryTint : 'none'}
        />
      </Svg>
    ),
  },
  playlist: {
    label: 'Playlist',
    icon: (active) => (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        {[3, 8, 13].map((y) => (
          <Rect key={y} x={1} y={y} width={16} height={3} rx={1.5} fill={active ? colors.primary : colors.subtle} />
        ))}
      </Svg>
    ),
  },
  activity: {
    label: 'Activity',
    icon: (active) => (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Rect x={2} y={9} width={4} height={8} rx={2} fill={active ? colors.primary : colors.subtle} />
        <Rect x={7.5} y={3} width={4} height={14} rx={2} fill={active ? colors.primary : colors.subtle} />
        <Rect x={13} y={6} width={4} height={11} rx={2} fill={active ? colors.primary : colors.subtle} />
      </Svg>
    ),
  },
  settings: {
    label: 'Settings',
    icon: (active) => (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Circle
          cx={9}
          cy={9}
          r={6.5}
          stroke={active ? colors.primary : colors.subtle}
          strokeWidth={3}
          fill="none"
        />
      </Svg>
    ),
  },
};

/** Custom parent-zone tab bar matching s10: Home · Playlist · Activity · Settings. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            {tab.icon(active)}
            <Txt weight="extrabold" size={10.5} color={active ? colors.primary : colors.subtle}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(23,32,51,.07)',
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
});

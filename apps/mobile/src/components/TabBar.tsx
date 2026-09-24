import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/theme/tokens';
import { springs } from '@/theme/motion';
import { Txt } from './Txt';
import { AppIcon, type AppIconName } from './AppIcon';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePendingRequests } from '@/stores/requestStore';

/** Three tabs: Channels live inside Playlist now, Activity inside Today. */
const TABS: Record<string, { label: string; icon: AppIconName }> = {
  index: { label: 'Today', icon: 'home' },
  playlist: { label: 'Playlist', icon: 'videos' },
  settings: { label: 'Settings', icon: 'settings' },
};

function Tab({
  label,
  icon,
  active,
  badge,
  sidebar,
  onPress,
}: {
  label: string;
  icon: AppIconName;
  active: boolean;
  badge: number;
  sidebar: boolean;
  onPress: () => void;
}) {
  const on = useSharedValue(active ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    on.value = withSpring(active ? 1 : 0, springs.snappy);
    if (active) pop.value = withSequence(withSpring(1.18, springs.press), withSpring(1, springs.bouncy));
  }, [active, on, pop]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: interpolate(on.value, [0, 1], [0.85, 1]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={badge > 0 ? `${label}, ${badge} waiting` : label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, sidebar && styles.sidebarTab]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.activePill, pillStyle]} />
      <Animated.View style={iconStyle}>
        <AppIcon name={icon} size={26} muted={!active} style={styles.icon} />
      </Animated.View>
      {badge > 0 ? (
        <View style={[styles.badge, sidebar && { right: 6, top: 6 }]}>
          <Txt weight="black" size={9.5} color="#fff">{badge}</Txt>
        </View>
      ) : null}
      <Txt weight="extrabold" size={sidebar ? 14 : 11} color={active ? colors.child.skyDeep : colors.parent.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function TabBar({ state, navigation, sidebar = false }: BottomTabBarProps & { sidebar?: boolean }) {
  const insets = useSafeAreaInsets();
  const childId = useAppStore((s) => s.activeChildProfileId);
  const waiting =
    usePlaylistVideos(childId).filter((video) => video.status === 'review').length +
    usePendingRequests(childId).length;
  return (
    <View style={[styles.bar, { marginBottom: sidebar ? 12 : Math.max(insets.bottom - 12, 8) }, sidebar && styles.sidebar]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        return (
          <Tab
            key={route.key}
            label={tab.label}
            icon={tab.icon}
            active={active}
            badge={route.name === 'playlist' ? waiting : 0}
            sidebar={sidebar}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) {
                void Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { flexDirection: 'column', gap: 8, marginHorizontal: 10 },
  sidebarTab: { flex: 0, flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12, gap: 10, minHeight: 56 },
  bar: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 18,
    marginHorizontal: 14,
    padding: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54, borderRadius: 12 },
  activePill: { borderRadius: 12, backgroundColor: '#DCEFF6' },
  icon: { borderRadius: 8 },
  badge: {
    position: 'absolute',
    top: 4,
    right: '26%',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.child.coral,
  },
});

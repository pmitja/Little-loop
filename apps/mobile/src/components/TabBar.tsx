import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';
import { AppIcon } from './AppIcon';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';

const TABS: Record<string, { label: string; icon: (active: boolean) => React.ReactNode }> = {
  index: {
    label: 'Home',
    icon: (active) => <AppIcon name="home" size={25} muted={!active} />,
  },
  playlist: {
    label: 'Videos',
    icon: (active) => <AppIcon name="videos" size={25} muted={!active} />,
  },
  settings: {
    label: 'Settings',
    icon: (active) => <AppIcon name="settings" size={25} muted={!active} />,
  },
};

/** Custom parent-zone tab bar matching s10: Home · Playlist · Activity · Settings. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const childId = useAppStore(s => s.activeChildProfileId);
  const pending = usePlaylistVideos(childId).filter((video) => video.status === 'review').length;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
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
            style={[styles.tab, active && styles.activeTab]}
          >
            {tab.icon(active)}
            {route.name === 'playlist' && pending > 0 ? <View style={styles.badge}><Txt weight="black" size={9} color="#fff">{pending}</Txt></View> : null}
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
    borderRadius: 18,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: colors.ink, shadowOpacity: .12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54, borderRadius: 12, position: 'relative' },
  activeTab: { backgroundColor: '#DCEFF6' },
  badge: { position:'absolute', top:2, right:'24%', minWidth:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center', backgroundColor:colors.child.coral },
});

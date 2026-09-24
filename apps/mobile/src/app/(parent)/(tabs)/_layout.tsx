import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SIDEBAR_WIDTH } from '@/theme/layout';
import { colors } from '@/theme/tokens';
import { Redirect, Tabs } from 'expo-router';
import { ChildModeBar, TabBar } from '@/components';
import { useAppStore } from '@/stores/appStore';

export default function TabsLayout() {
  const { sidebar } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);

  // Every parent screen is about a child — the dashboard, playlist, activity and
  // most of settings are empty or meaningless without one. Deleting the last child
  // used to leave the parent browsing hollow tabs; send them to create one instead.
  if (!hasProfile) {
    return <Redirect href={{ pathname: '/(onboarding)/child-profile', params: { forced: '1' } }} />;
  }

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#F4F1EB' },
        tabBarHideOnKeyboard: true,
        tabBarPosition: sidebar ? 'left' : 'bottom',
      }}
      // The handoff sits directly above the tabs, so it is on screen wherever the
      // parent is standing — Today, Playlist or Settings. With a sidebar it moves
      // out of the rail and spans the full width below both (see below).
      tabBar={(props) => (
        sidebar ? (
          <View
            style={{
              width: SIDEBAR_WIDTH + insets.left,
              backgroundColor: colors.bg,
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: colors.parent.hairline,
              paddingTop: insets.top + 16,
              paddingBottom: 12,
              paddingLeft: insets.left,
            }}
          >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
              <TabBar {...props} sidebar />
            </ScrollView>
          </View>
        ) : (
          <View>
            <ChildModeBar />
            <TabBar {...props} />
          </View>
        )
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="playlist" />
      <Tabs.Screen name="channels" options={{ href: null }} />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="activity" options={{ href: null }} />
    </Tabs>
  );

  if (!sidebar) return tabs;

  return (
    <View style={styles.root}>
      <View style={styles.flex}>{tabs}</View>
      <View style={[styles.handoff, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ChildModeBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  handoff: {
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.parent.hairline,
  },
});

import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { RAIL_WIDTH } from '@/theme/layout';
import { colors } from '@/theme/tokens';
import { Redirect, Tabs } from 'expo-router';
import { ChildModeBar, HandoverButton, TabBar } from '@/components';
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
      // parent is standing — Today, Playlist or Settings. On an iPad the tabs
      // become a rail down the left edge and the handoff sits at its foot.
      tabBar={(props) => (
        sidebar ? (
          <View
            style={[
              styles.rail,
              {
                width: RAIL_WIDTH + insets.left,
                paddingTop: insets.top + 20,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
                paddingLeft: insets.left,
              },
            ]}
          >
            <Image source={APP_ICON} style={styles.railIcon} accessible={false} />
            <TabBar {...props} sidebar />
            <View style={styles.flex} />
            <HandoverButton />
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

  return tabs;
}

const APP_ICON = require('../../../../assets/images/icon.png');

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rail: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: '#ECE6DB',
    zIndex: 2,
  },
  railIcon: { width: 46, height: 46, borderRadius: 14, marginBottom: 18 },
});

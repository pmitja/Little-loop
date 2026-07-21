import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { ChildModeBar, TabBar } from '@/components';
import { useAppStore } from '@/stores/appStore';

export default function TabsLayout() {
  const hasProfile = useAppStore((s) => s.childProfiles.length > 0);

  // Every parent screen is about a child — the dashboard, playlist, activity and
  // most of settings are empty or meaningless without one. Deleting the last child
  // used to leave the parent browsing hollow tabs; send them to create one instead.
  if (!hasProfile) {
    return <Redirect href={{ pathname: '/(onboarding)/child-profile', params: { forced: '1' } }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#F4F1EB' },
        tabBarHideOnKeyboard: true,
      }}
      // The handoff sits directly above the tabs, so it is on screen wherever the
      // parent is standing — Today, Playlist or Settings.
      tabBar={(props) => (
        <View>
          <ChildModeBar />
          <TabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="playlist" />
      <Tabs.Screen name="channels" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="activity" options={{ href: null }} />
    </Tabs>
  );
}

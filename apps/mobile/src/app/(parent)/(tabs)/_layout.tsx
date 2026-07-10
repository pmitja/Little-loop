import { Tabs } from 'expo-router';
import { TabBar } from '@/components';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#F4F1EB' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="playlist" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="activity" options={{ href: null }} />
    </Tabs>
  );
}

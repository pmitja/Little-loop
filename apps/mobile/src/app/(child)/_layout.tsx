import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LockedModal } from '@/components/LockedModal';
import { useAppStore } from '@/stores/appStore';
import { useTimerStore } from '@/stores/timerStore';
import { useLockedModalStore } from '@/features/child/lockedModalStore';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { useLivePlaylistVideos } from '@/stores/playlistStore';
import { KidWaitingScreen } from '@/features/kid/KidWaitingScreen';

export default function ChildLayout() {
  const router = useRouter();
  const lockedVisible = useLockedModalStore((s) => s.visible);
  // A child's own device has no parent exit at all — nothing to unlock.
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const premiumBlocked = useKidDeviceStore((s) => s.premiumBlocked);
  const profile = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const liveVideos = useLivePlaylistVideos(profile?.id ?? null);

  // Android hardware back never leaves child mode — it raises the lock (PLAN §10).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!kidDevice) useLockedModalStore.getState().show();
      return true;
    });
    return () => sub.remove();
  }, [kidDevice]);

  // Restore path: app killed during child mode → splash reconciled the orphaned
  // session, so a fresh one starts here.
  useEffect(() => {
    const timer = useTimerStore.getState();
    if (!timer.activeSessionId) {
      const { activeChildProfileId, childProfiles } = useAppStore.getState();
      const childId = activeChildProfileId ?? childProfiles[0]?.id;
      if (childId) timer.startSession(childId);
    }
  }, []);

  if (kidDevice && (premiumBlocked || liveVideos.length === 0)) {
    return (
      <KidWaitingScreen
        nickname={profile?.nickname}
        avatar={profile?.avatar}
        reason={premiumBlocked ? 'ask-grown-up' : 'no-videos'}
      />
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          contentStyle: { backgroundColor: '#FFF4E2' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="request" />
        <Stack.Screen name="player" options={{ contentStyle: { backgroundColor: '#111B31' } }} />
        <Stack.Screen name="times-up" options={{ contentStyle: { backgroundColor: '#1C2B4E' } }} />
      </Stack>
      <LockedModal
        visible={lockedVisible && !kidDevice}
        onDismiss={() => useLockedModalStore.getState().hide()}
        onParentUnlock={() => {
          useLockedModalStore.getState().hide();
          router.push('/pin-unlock');
        }}
      />
    </>
  );
}

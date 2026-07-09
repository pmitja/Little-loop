import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LockedModal } from '@/components/LockedModal';
import { useAppStore } from '@/stores/appStore';
import { useTimerStore } from '@/stores/timerStore';
import { useLockedModalStore } from '@/features/child/lockedModalStore';

export default function ChildLayout() {
  const router = useRouter();
  const lockedVisible = useLockedModalStore((s) => s.visible);

  // Android hardware back never leaves child mode — it raises the lock (PLAN §10).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      useLockedModalStore.getState().show();
      return true;
    });
    return () => sub.remove();
  }, []);

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
        <Stack.Screen name="player" options={{ contentStyle: { backgroundColor: '#111B31' } }} />
        <Stack.Screen name="times-up" options={{ contentStyle: { backgroundColor: '#1C2B4E' } }} />
      </Stack>
      <LockedModal
        visible={lockedVisible}
        onDismiss={() => useLockedModalStore.getState().hide()}
        onParentUnlock={() => {
          useLockedModalStore.getState().hide();
          router.push('/pin-unlock');
        }}
      />
    </>
  );
}

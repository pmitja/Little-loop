import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF9F1' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-video" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review-video" options={{ presentation: 'modal' }} />
      <Stack.Screen name="channel-approved" options={{ presentation: 'modal' }} />
      <Stack.Screen name="channels" />
      <Stack.Screen name="add-child" />
      <Stack.Screen name="edit-child" />
      <Stack.Screen name="caregivers" />
      <Stack.Screen name="change-pin" />
      <Stack.Screen name="child-mode-gate" />
      <Stack.Screen name="time-limit" />
      <Stack.Screen name="legal" />
    </Stack>
  );
}

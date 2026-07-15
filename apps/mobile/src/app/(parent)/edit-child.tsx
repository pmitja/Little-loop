import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ParentHeader, ScreenContainer, showAppAlert, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { ChildProfileForm } from '@/features/family/ChildProfileForm';
import { deleteChildProfile } from '@/features/family/deleteChildProfile';

/**
 * Edit an existing child: nickname, age, avatar, daily limit.
 *
 * Delete lives here rather than in Settings so it is scoped to the child whose
 * name is on the screen — the settings row acted on whichever profile happened to
 * be active, which is not something a parent should have to reason about.
 */
export default function EditChild() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const profile = useAppStore(
    (s) =>
      s.childProfiles.find((p) => p.id === (params.id ?? s.activeChildProfileId)) ??
      s.childProfiles[0] ??
      null,
  );
  const isOwner = useAppStore((state) => state.familyRole !== 'caregiver');

  // Deleting the last child unmounts this screen mid-navigation; bail out rather
  // than render a form with nothing behind it.
  if (!profile) return <Redirect href="/(parent)/(tabs)" />;

  const confirmDelete = () => {
    showAppAlert(
      `Remove ${profile.nickname}’s profile?`,
      'Their playlist, time limits, and watch history will be deleted. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            router.back();
            void deleteChildProfile(profile.id);
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scroll style={styles.container}>
      <ParentHeader
        title="Edit profile"
        onBack={() => router.back()}
        right={isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${profile.nickname}’s profile`}
            onPress={confirmDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          >
            <Txt weight="extrabold" size={14} color={colors.red}>
              Delete
            </Txt>
          </Pressable>
        ) : undefined}
      />
      <View style={{ height: 16 }} />
      <ChildProfileForm profile={profile} onCreated={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  delete: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FDEAE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});

import { Pressable, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { Appear, ParentHeader, ScreenContainer, showAppAlert, Txt, usePane } from '@/components';
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
  const pane = usePane<{ id?: string }>();
  const params = pane.params;
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
            pane.back();
            void deleteChildProfile(profile.id);
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scroll style={styles.container}>
      <Appear index={0}>
        <ParentHeader title="Edit profile" onBack={pane.canGoBack ? pane.back : undefined} />
      </Appear>
      <Appear index={1} style={styles.intro}>
        <Txt weight="black" size={28} lineHeight={33}>Name and buddy</Txt>
        <Txt weight="bold" size={15} color={colors.parent.muted}>
          {profile.nickname} sees their buddy on every kid screen.
        </Txt>
      </Appear>
      <Appear index={2} style={pane.inPane ? styles.paneForm : undefined}>
        <ChildProfileForm
          profile={profile}
          onCreated={pane.back}
          after={isOwner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${profile.nickname}’s profile`}
              onPress={confirmDelete}
              hitSlop={8}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
            >
              <Txt weight="extrabold" size={14} color={colors.red} center>
                Remove {profile.nickname}’s profile
              </Txt>
            </Pressable>
          ) : undefined}
        />
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16, gap: 22 },
  intro: { gap: 6 },
  paneForm: { maxWidth: 520 },
  remove: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 },
  pressed: { opacity: 0.6 },
});

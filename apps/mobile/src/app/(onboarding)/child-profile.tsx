import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { ChildProfileForm } from '@/features/family/ChildProfileForm';

/** s06 — child profile creation: nickname, age range, avatar, optional daily limit. */
export default function ChildProfileScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scroll style={styles.container}>
      <Txt weight="black" size={27}>
        Add your child
      </Txt>
      <Txt weight="semibold" size={14} color={colors.muted} style={{ marginTop: 6, marginBottom: 22 }}>
        Only a nickname is needed — no personal data.
      </Txt>
      <ChildProfileForm onCreated={() => router.replace('/(onboarding)/first-video')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 36 },
});

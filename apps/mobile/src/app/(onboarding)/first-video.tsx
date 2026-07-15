import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ScreenContainer, StoryIllustration, Txt } from '@/components';
import { colors } from '@/theme/tokens';

/** The third onboarding step intentionally gets a real approved video before handoff. */
export default function FirstVideo() {
  const router = useRouter();

  return (
    <ScreenContainer style={styles.root}>
      <Txt weight="black" size={12} color={colors.primaryDark} center style={styles.stepLabel}>STEP 3 OF 3</Txt>
      <StoryIllustration scene="add-video" width={220} style={styles.art} />
      <Txt weight="black" size={26} center>
        Add one trusted video
      </Txt>
      <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
        Paste a YouTube link, check the title and thumbnail, then approve it.
      </Txt>
      <View style={{ flex: 1 }} />
      <Button title="Add first video" onPress={() => router.push('/(parent)/add-video')} />
      <Button
        title="I’ll do this later"
        variant="ghost"
        size="md"
        onPress={() => router.replace('/(parent)/(tabs)')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 32, gap: 18 },
  stepLabel: { letterSpacing: 0.8 },
  art: { alignSelf: 'center', borderRadius: 28 },
});

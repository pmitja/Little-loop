import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Appear, Button, Float, ScreenContainer, StepHeader, StoryIllustration, Txt } from '@/components';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/tokens';

/** The third onboarding step intentionally gets a real approved video before handoff. */
export default function FirstVideo() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const name = useAppStore((s) => s.childProfiles[0]?.nickname ?? 'your child');

  return (
    <ScreenContainer scroll style={styles.root}>
      <StepHeader step={3} total={3} />
      <Appear index={0}>
        <Float distance={6} sway={1} duration={2600}>
          <StoryIllustration scene="add-video" width={Math.min(width - 48, 520)} style={styles.art} />
        </Float>
      </Appear>
      <Appear index={1} style={{ gap: 6 }}>
        <Txt weight="black" size={28} lineHeight={33}>
          Add {name}’s first video
        </Txt>
        <Txt weight="bold" size={15} color={colors.muted} lineHeight={21.75}>
          Copy a link in YouTube, then paste it here. You’ll check the title and picture before it’s added.
        </Txt>
      </Appear>
      <View style={{ flex: 1 }} />
      <Appear index={2}>
        <Button title={`Add ${name}’s first video`} onPress={() => router.push('/(parent)/add-video')} />
      </Appear>
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
  root: { paddingTop: 16, gap: 20 },
  art: { alignSelf: 'center', borderRadius: 28 },
});

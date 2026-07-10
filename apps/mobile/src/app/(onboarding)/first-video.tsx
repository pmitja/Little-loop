import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, OwlBubble, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';

/** The third onboarding step intentionally gets a real approved video before handoff. */
export default function FirstVideo() {
  const router = useRouter();
  const profile = useAppStore(
    (s) => s.childProfiles.find((x) => x.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );

  return (
    <ScreenContainer style={styles.root}>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i === 2 && styles.on]} />
        ))}
      </View>
      <OwlBubble>Let’s choose {profile?.nickname ?? 'your child'}’s first video.</OwlBubble>
      <Txt weight="black" size={26} center>
        Paste a video you trust
      </Txt>
      <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
        You’ll see the title and thumbnail before approving it. Your child will never browse
        beyond it.
      </Txt>
      <View style={{ flex: 1 }} />
      <Button title="Paste first video" onPress={() => router.push('/(parent)/add-video')} />
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
  root: { paddingTop: 50, gap: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D5DD' },
  on: { width: 22, backgroundColor: colors.child.skyDeep },
});

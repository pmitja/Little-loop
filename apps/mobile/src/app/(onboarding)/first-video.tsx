import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Appear, Button, Float, ScreenContainer, StepHeader, StoryIllustration, Txt } from '@/components';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAppStore } from '@/stores/appStore';
import { colors, exactType } from '@/theme/tokens';

/** The third onboarding step intentionally gets a real approved video before handoff. */
export default function FirstVideo() {
  const router = useRouter();
  const { width, height, isTablet, landscape } = useResponsiveLayout();
  const name = useAppStore((s) => s.childProfiles[0]?.nickname ?? 'your child');
  // iPad: the art and the words share the screen — side by side in landscape,
  // stacked in portrait — instead of scrolling past each other.
  const side = isTablet && landscape;
  const artWidth = isTablet
    ? Math.min(side ? (width - 152) / 2 : width - 112, side ? height * 0.75 : height * 0.4 * 1.34, 560)
    : Math.min(width - 48, 520);

  const art = (
    <Appear index={0} style={isTablet ? styles.artCell : undefined}>
      <Float distance={6} sway={1} duration={2600}>
        <StoryIllustration scene="add-video" width={artWidth} style={styles.art} />
      </Float>
    </Appear>
  );
  const copy = (
    <Appear index={1} style={{ gap: isTablet ? 8 : 6 }}>
      <Txt weight="black" size={isTablet ? exactType(36) : 28} lineHeight={isTablet ? exactType(42) : 33}>
        Add {name}’s first video
      </Txt>
      <Txt weight="bold" size={isTablet ? exactType(17) : 15} color={colors.muted} lineHeight={isTablet ? exactType(25) : 21.75}>
        Copy a link in YouTube, then paste it here. You’ll check the title and picture before it’s added.
      </Txt>
    </Appear>
  );
  const actions = (
    <>
      <Appear index={2}>
        <Button title={`Add ${name}’s first video`} onPress={() => router.push('/(parent)/add-video')} />
      </Appear>
      <Button
        title="I’ll do this later"
        variant="ghost"
        size="md"
        onPress={() => router.replace('/(parent)/(tabs)')}
      />
    </>
  );

  if (isTablet) {
    return (
      <ScreenContainer scroll style={styles.tabletRoot}>
        <StepHeader step={3} total={3} />
        <View style={[styles.body, side && styles.bodySide]}>
          {art}
          <View style={styles.side}>
            {copy}
            <View style={{ gap: 4, marginTop: 8 }}>{actions}</View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll style={styles.root}>
      <StepHeader step={3} total={3} />
      {art}
      {copy}
      <View style={{ flex: 1 }} />
      {actions}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 20 },
  art: { alignSelf: 'center', borderRadius: 28 },
  tabletRoot: { paddingTop: 24, paddingHorizontal: 56, paddingBottom: 24, gap: 32 },
  body: { flex: 1, gap: 40, justifyContent: 'center' },
  bodySide: { flexDirection: 'row', alignItems: 'center' },
  artCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, gap: 20, justifyContent: 'center' },
});

import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppIcon, Appear, Float, ParentHeader, ScreenContainer, SettingsGroup, SettingsRow, StoryIllustration, Txt } from '@/components';
import { colors } from '@/theme/tokens';

/**
 * 18c — Grown-up PIN. Changing it is the one action here; a forgotten PIN is
 * handled from the unlock screen's "Forgot PIN?", where it is actually needed.
 */
export default function Safety() {
  const router = useRouter();

  return (
    <ScreenContainer scroll style={styles.root}>
      <Appear index={0}>
        <ParentHeader title="Grown-up PIN" onBack={() => router.back()} />
      </Appear>
      <Appear index={1} style={styles.art}>
        <Float distance={5} sway={1.5} duration={2400}>
          <StoryIllustration scene="pin-safe" width={170} />
        </Float>
      </Appear>
      <Appear index={2} style={styles.copy}>
        <Txt weight="black" size={24} center>Your PIN is on</Txt>
        <Txt weight="bold" size={15} lineHeight={21} color={colors.parent.muted} center>
          It keeps kids out of settings and in Child Mode.
        </Txt>
      </Appear>
      <Appear index={3}>
        <SettingsGroup>
          <SettingsRow
            icon={<AppIcon name="pin" size={32} />}
            iconBg="transparent"
            title="Change PIN"
            chevron
            onPress={() => router.push('/(parent)/change-pin')}
          />
        </SettingsGroup>
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 18 },
  art: { alignItems: 'center', marginTop: 4 },
  copy: { gap: 6, alignItems: 'center' },
});

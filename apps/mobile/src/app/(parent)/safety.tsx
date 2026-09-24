import { StyleSheet, View } from 'react-native';
import { AppIcon, Appear, Float, ParentHeader, ScreenContainer, SettingsGroup, SettingsRow, StoryIllustration, Txt, usePane } from '@/components';
import { colors } from '@/theme/tokens';

/**
 * 18c — Grown-up PIN. Changing it is the one action here; a forgotten PIN is
 * handled from the unlock screen's "Forgot PIN?", where it is actually needed.
 */
export default function Safety() {
  const pane = usePane();

  return (
    <ScreenContainer scroll style={styles.root}>
      <Appear index={0}>
        <ParentHeader title="Grown-up PIN" onBack={pane.canGoBack ? pane.back : undefined} />
      </Appear>
      {/* Beside the settings list on an iPad the art and the words share a row. */}
      <View style={pane.inPane ? styles.paneRow : undefined}>
        <Appear index={1} style={styles.art}>
          <Float distance={5} sway={1.5} duration={2400}>
            <StoryIllustration scene="pin-safe" width={pane.inPane ? 120 : 170} />
          </Float>
        </Appear>
        <Appear index={2} style={[styles.copy, pane.inPane && styles.paneCopy]}>
          <Txt weight="black" size={24} center={!pane.inPane}>Your PIN is on</Txt>
          <Txt weight="bold" size={15} lineHeight={21} color={colors.parent.muted} center={!pane.inPane}>
            It keeps kids out of settings and in Child Mode.
          </Txt>
        </Appear>
      </View>
      <Appear index={3}>
        <SettingsGroup>
          <SettingsRow
            icon={<AppIcon name="pin" size={32} />}
            iconBg="transparent"
            title="Change PIN"
            chevron
            onPress={() => pane.open('change-pin')}
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
  paneRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  paneCopy: { flex: 1, alignItems: 'flex-start' },
});

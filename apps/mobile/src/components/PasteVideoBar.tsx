import { StyleSheet, View } from 'react-native';
import { colors, controls } from '@/theme/tokens';
import { AppIcon } from './AppIcon';
import { PressableScale } from './Motion';
import { Txt } from './Txt';

/** The one "add a video" entry point, shared by Today and the Playlist. */
/** `title` swaps the headline, e.g. for a child's very first video. */
export function PasteVideoBar({ onPress, title = 'Paste a YouTube link' }: { onPress: () => void; title?: string }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Add a video" onPress={onPress} pressedScale={0.98} style={styles.bar}>
      <AppIcon name="add-video" size={42} style={styles.icon} />
      <View style={styles.copy}>
        <Txt weight="black" size={16}>{title}</Txt>
        <Txt weight="bold" size={12} color={colors.child.skyDeep}>or share from the YouTube app</Txt>
      </View>
      <View style={styles.cta}>
        <Txt weight="black" size={14} color="#FFFFFF">Paste</Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.child.skyDeep,
    backgroundColor: colors.primaryTint,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { borderRadius: 12 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  cta: {
    height: controls.minTouchParent,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.parent.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';
import { Button } from './Button';

function PlayGlyph() {
  return (
    <Svg width={26} height={30} viewBox="0 0 26 30">
      <Path d="M3 2 L24 15 L3 28 Z" fill={colors.primary} strokeLinejoin="round" strokeWidth={4} stroke={colors.primary} />
    </Svg>
  );
}

interface NoVideosModalProps {
  visible: boolean;
  childName?: string;
  onAddVideo: () => void;
  onDismiss: () => void;
}

/** Shown when a child profile is picked but has no approved videos yet. */
export function NoVideosModal({ visible, childName, onAddVideo, onDismiss }: NoVideosModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <PlayGlyph />
          </View>
          <Txt weight="black" size={23} center>
            No videos yet
          </Txt>
          <Txt
            weight="semibold"
            size={14.5}
            color={colors.muted}
            center
            style={{ marginTop: 8, marginBottom: 22 }}
          >
            {childName ? `${childName} doesn’t have any approved videos.` : 'This profile doesn’t have any approved videos.'}{' '}
            Add one to get started.
          </Txt>
          <Button
            title="Add a video"
            onPress={onAddVideo}
            size="md"
            style={{ alignSelf: 'stretch', height: 52, borderRadius: 26 }}
          />
          <Pressable onPress={onDismiss} hitSlop={10}>
            <Txt weight="extrabold" size={13.5} color={colors.subtle} style={{ marginTop: 15 }}>
              Not now
            </Txt>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 26,
    alignItems: 'center',
    ...shadows.cardLg,
    shadowOpacity: 0.3,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

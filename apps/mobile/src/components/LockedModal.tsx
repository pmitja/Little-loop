import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, shadows } from '@/theme/tokens';
import { Txt } from './Txt';
import { Button } from './Button';

/** Padlock built from primitives, matching the design's CSS glyph. */
export function LockGlyph({ color = colors.primary, scale = 1 }: { color?: string; scale?: number }) {
  return (
    <View style={{ alignItems: 'center', transform: [{ scale }] }}>
      <View
        style={{
          width: 15,
          height: 11,
          borderWidth: 3,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
      <View style={{ width: 26, height: 18, borderRadius: 6, backgroundColor: color }} />
    </View>
  );
}

interface LockedModalProps {
  visible: boolean;
  onDismiss: () => void;
  onParentUnlock: () => void;
}

/** s15 — "Ask a parent" modal for any protected interaction in child mode. */
export function LockedModal({ visible, onDismiss, onParentUnlock }: LockedModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <LockGlyph />
          </View>
          <Txt weight="black" size={23}>
            Ask a parent
          </Txt>
          <Txt weight="semibold" size={14.5} color={colors.muted} style={{ marginTop: 8, marginBottom: 22 }}>
            This area is protected.
          </Txt>
          <Button title="OK" onPress={onDismiss} size="md" style={{ alignSelf: 'stretch', height: 52, borderRadius: 26 }} />
          <Pressable onPress={onParentUnlock} hitSlop={10}>
            <Txt weight="extrabold" size={13.5} color={colors.subtle} style={{ marginTop: 15 }}>
              Parent unlock
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

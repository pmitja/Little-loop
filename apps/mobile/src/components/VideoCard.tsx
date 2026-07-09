import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { formatDuration, type PlaylistVideo } from '@littleloop/shared';
import { colors, radii, shadows } from '@/theme/tokens';
import { Txt } from './Txt';

interface VideoRowProps {
  item: PlaylistVideo;
  onRemove?: () => void;
  /** Long-press target that starts a drag (react-native-draggable-flatlist). */
  onDragStart?: () => void;
  dragging?: boolean;
}

function DragHandle({ active }: { active?: boolean }) {
  const bar = { backgroundColor: active ? colors.primary : '#C6CDD8' };
  return (
    <View style={styles.handle}>
      <View style={[styles.handleBar, bar]} />
      <View style={[styles.handleBar, bar]} />
      <View style={[styles.handleBar, bar]} />
    </View>
  );
}

function addedLabel(iso: string): string {
  return `Added ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** s11 parent playlist row: drag handle · 86×56 thumb · title/meta · remove. */
export function VideoRow({ item, onRemove, onDragStart, dragging }: VideoRowProps) {
  const { video } = item;
  const meta = [
    video.durationSeconds ? formatDuration(video.durationSeconds) : null,
    addedLabel(item.addedAt),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, dragging ? styles.rowDragging : shadows.card]}>
      <Pressable onLongPress={onDragStart} delayLongPress={150} hitSlop={10}>
        <DragHandle active={dragging} />
      </Pressable>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
      </View>
      <View style={styles.texts}>
        <Txt weight="extrabold" size={13.5} lineHeight={17.5} numberOfLines={2}>
          {video.title}
        </Txt>
        <Txt weight="semibold" size={11.5} color={colors.subtle} style={{ marginTop: 3 }}>
          {meta}
        </Txt>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <View style={styles.removeDash} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PlusIcon({ color = '#FFFFFF', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path
        d="M11 4 V18 M4 11 H18"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 14,
  },
  rowDragging: {
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  handle: { gap: 3.5, paddingVertical: 6, paddingRight: 2 },
  handleBar: { width: 14, height: 2.5, borderRadius: 2 },
  thumbWrap: {
    width: 86,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#DDEEFE',
  },
  thumb: { flex: 1 },
  texts: { flex: 1, minWidth: 0 },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDash: { width: 11, height: 2.5, borderRadius: 2, backgroundColor: colors.red },
});

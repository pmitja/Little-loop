import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import Svg, { Path, Rect } from 'react-native-svg';
import type { PlaylistVideo } from '@littleloop/shared';
import {
  AddVideoIllustration,
  Button,
  ChildAvatar,
  EmptyState,
  PlusIcon,
  ScreenContainer,
  Txt,
  VideoRow,
} from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore, usePlaylistVideos } from '@/stores/playlistStore';

function LockNote() {
  return (
    <View style={styles.footerNote}>
      <Svg width={13} height={16} viewBox="0 0 13 16">
        <Path
          d="M3.5 7 V5 a3 3 0 0 1 6 0 v2"
          stroke="#B9C2D0"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <Rect x={0.5} y={6.5} width={12} height={9} rx={3} fill="#B9C2D0" />
      </Svg>
      <Txt weight="semibold" size={12.5} color={colors.subtle}>
        Only you can add or remove videos
      </Txt>
    </View>
  );
}

/** s07 (empty) / s11 (populated) — the playlist tab. */
export default function Playlist() {
  const router = useRouter();
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = usePlaylistVideos(profile?.id ?? null);
  const removeVideo = usePlaylistStore((s) => s.removeVideo);
  const reorderVideos = usePlaylistStore((s) => s.reorderVideos);

  const name = profile?.nickname ?? 'Your child';
  const possessive = name.endsWith('s') ? `${name}’` : `${name}’s`;

  const confirmRemove = (item: PlaylistVideo) => {
    if (!profile) return;
    Alert.alert('Remove video?', `“${item.video.title}” will disappear from ${possessive} playlist.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeVideo(profile.id, item.id) },
    ]);
  };

  if (videos.length === 0) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.titleRow}>
          {profile ? <ChildAvatar avatar={profile.avatar} size={40} /> : null}
          <Txt weight="black" size={24}>
            {possessive} playlist
          </Txt>
        </View>
        <Txt weight="semibold" size={13.5} color={colors.muted}>
          0 approved videos
        </Txt>
        <View style={styles.center}>
          <EmptyState
            illustration={<AddVideoIllustration />}
            title="Start with your first approved video"
            body="Add videos manually. Your child will only be able to watch what you choose."
            ctaLabel="Add Video"
            onCta={() => router.push('/(parent)/add-video')}
            secondaryLabel="Skip for now"
            onSecondary={() => router.navigate('/(parent)/(tabs)')}
          />
        </View>
        <LockNote />
      </ScreenContainer>
    );
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<PlaylistVideo>) => (
    <View style={styles.rowSpacing}>
      <VideoRow item={item} dragging={isActive} onDragStart={drag} onRemove={() => confirmRemove(item)} />
    </View>
  );

  return (
    <ScreenContainer style={styles.container} padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Txt weight="black" size={24}>
            {possessive} Playlist
          </Txt>
          <Pressable
            onPress={() => router.push('/(parent)/add-video')}
            style={[styles.addButton, shadows.primaryButton]}
            hitSlop={6}
          >
            <PlusIcon size={18} />
          </Pressable>
        </View>
        <Txt weight="semibold" size={13.5} color={colors.muted} style={{ marginTop: 4 }}>
          {videos.length} approved {videos.length === 1 ? 'video' : 'videos'} · drag to reorder
        </Txt>
      </View>
      <DraggableFlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) =>
          profile &&
          reorderVideos(
            profile.id,
            data.map((v) => v.id),
          )
        }
        activationDistance={12}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <Button
            title="Preview Child Mode"
            variant="outline"
            size="md"
            style={{ marginTop: 8 }}
            onPress={() => router.push('/(parent)/child-mode-gate')}
          />
        }
      />
      <LockNote />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center' },
  header: { paddingHorizontal: 24, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSpacing: { paddingHorizontal: 24, paddingBottom: 12 },
  listContent: { paddingBottom: 12 },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
    paddingTop: 6,
  },
});

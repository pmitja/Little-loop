import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { FREE_LIMITS, formatDuration, type PlaylistVideo } from '@littleloop/shared';
import {
  AddVideoIllustration,
  AppIcon,
  EmptyState,
  ParentHeader,
  showAppAlert,
  StatusBadge,
  Txt,
} from '@/components';
import { colors, controls, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { removeSharedVideo, reorderSharedVideos, syncFamilyPlaylists } from '@/features/family/playlistSync';

/** Three stacked bars — the standard "grab me" affordance (Spotify, SiriusXM). */
function DragHandle() {
  return (
    <View style={styles.handle}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.handleBar} />
      ))}
    </View>
  );
}

export default function Playlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore(
    (s) =>
      s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = usePlaylistVideos(profile?.id ?? null);
  const premium = usePremium();
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const latest = useAppStore.getState().childProfiles.find((item) => item.id === profile?.id);
      if (latest) void syncFamilyPlaylists([latest]).catch(() => {});
    }, [profile?.id]),
  );

  const name = profile?.nickname ?? 'Your child';
  const reviewCount = videos.filter((v) => v.status === 'review').length;

  const goPaste = () => {
    if (!premium && videos.length >= FREE_LIMITS.videosPerPlaylist) {
      router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: name } });
    } else {
      router.push('/(parent)/add-video');
    }
  };

  // Order is playback order in child mode, so a drag is a real settings change:
  // persist it as the finger lifts rather than staging it behind a Save button.
  const onDragEnd = ({ data }: { data: PlaylistVideo[] }) => {
    if (!profile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void reorderSharedVideos(profile.id, data).catch(() => {
      showAppAlert('Couldn’t save order', 'Refresh and try reordering again.');
    });
  };

  const confirmRemove = (item: PlaylistVideo) => {
    if (!profile) return;
    showAppAlert(
      'Remove this video?',
      `“${item.video.title}” will be removed from ${name}’s playlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void removeSharedVideo(profile.id, item).catch(() => {
              showAppAlert('Couldn’t remove video', 'Check your connection and try again.');
            });
          },
        },
      ],
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<PlaylistVideo>) => (
    <ScaleDecorator activeScale={1.03}>
      <Pressable
        accessibilityRole={item.status === 'review' ? 'button' : undefined}
        accessibilityLabel={item.status === 'review' ? `Review ${item.video.title}` : undefined}
        disabled={editing}
        onPress={() =>
          item.status === 'review'
            ? router.push({
                pathname: '/(parent)/review-video',
                params: { video: JSON.stringify(item.video), entryId: item.id },
              })
            : undefined
        }
        style={[styles.row, isActive && styles.rowActive]}
      >
        <Image source={{ uri: item.video.thumbnailUrl }} style={styles.thumb} />
        <View style={styles.copy}>
          <Txt weight="bold" size={14} numberOfLines={1}>
            {item.video.title}
          </Txt>
          <Txt size={12} color={colors.parent.muted}>
            {item.video.durationSeconds ? formatDuration(item.video.durationSeconds) : 'Video'} ·
            added{' '}
            {new Date(item.addedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Txt>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.video.title}`}
            accessibilityHint={`Removes this video from ${name}’s playlist after confirmation`}
            onPress={(event) => {
              event.stopPropagation();
              confirmRemove(item);
            }}
            hitSlop={4}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          >
            <AppIcon name="delete" size={25} />
          </Pressable>
          {editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reorder ${item.video.title}`}
              onPressIn={drag}
              hitSlop={6}
              style={styles.handleTouch}
            >
              <DragHandle />
            </Pressable>
          ) : (
            <StatusBadge state={(item.status ?? 'live').toUpperCase() as 'LIVE' | 'REVIEW'} />
          )}
        </View>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View style={styles.root}>
      <DraggableFlatList
        data={videos}
        keyExtractor={(item) => item.id}
        onDragEnd={onDragEnd}
        renderItem={renderItem}
        activationDistance={12}
        containerStyle={styles.listContainer}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ParentHeader
              title={`Videos for ${name}`}
              subtitle={premium ? undefined : `${videos.length} of ${FREE_LIMITS.videosPerPlaylist}`}
              right={
                videos.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={editing ? 'Finish editing playlist' : 'Edit playlist'}
                    onPress={() => setEditing((v) => !v)}
                    hitSlop={8}
                    style={[styles.editButton, editing && styles.editButtonActive]}
                  >
                    <Txt
                      weight="extrabold"
                      size={14}
                      color={editing ? '#FFFFFF' : colors.child.skyDeep}
                    >
                      {editing ? 'Done' : 'Edit'}
                    </Txt>
                  </Pressable>
                ) : null
              }
            />
            {editing ? (
              <View style={styles.hint}>
                <Txt weight="bold" size={12.5} color={colors.parent.muted}>
                  Drag the handle to set the order {name} watches in.
                </Txt>
              </View>
            ) : videos.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Add video" onPress={goPaste} style={styles.addButton}>
                <Txt weight="black" size={20} color={colors.child.skyDeep}>
                  ＋
                </Txt>
                <Txt weight="extrabold" size={15} color={colors.child.skyDeep}>
                  Add video
                </Txt>
              </Pressable>
            ) : null}
            {reviewCount > 0 && !editing ? (
              <View style={styles.reviewNote}>
                <Txt weight="bold" size={13} color={colors.amberText}>
                  {reviewCount} {reviewCount === 1 ? 'video needs' : 'videos need'} your approval
                </Txt>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            illustration={<AddVideoIllustration />}
            title="No videos yet"
            body={`Add one trusted video for ${name}. You’ll review it before it appears in Child Mode.`}
            ctaLabel="Add first video"
            onCta={goPaste}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parent.paper },
  listContainer: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  headerBlock: { gap: 14, paddingBottom: 14 },
  editButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#EAF6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonActive: { backgroundColor: colors.child.skyDeep },
  hint: {
    backgroundColor: '#EAF6FA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  reviewNote: { borderRadius: 14, backgroundColor: colors.amberTint, paddingHorizontal: 14, paddingVertical: 10 },
  row: {
    minHeight: 72,
    marginBottom: 9,
    padding: 8,
    backgroundColor: colors.parent.card,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rowActive: { ...shadows.cardLg },
  thumb: { width: 66, height: 48, borderRadius: 10, backgroundColor: '#EAF6FA' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
  },
  deleteButton: {
    width: controls.minTouchParent,
    height: controls.minTouchParent,
    marginTop: -5,
    marginRight: -5,
    borderRadius: controls.minTouchParent / 2,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  handleTouch: {
    width: controls.minTouchParent,
    height: controls.minTouchParent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { width: 18, gap: 3 },
  handleBar: { height: 2, borderRadius: 1, backgroundColor: '#C3BDB3' },
});

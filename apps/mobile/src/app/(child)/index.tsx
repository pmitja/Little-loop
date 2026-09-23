import { memo, useCallback, useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, type ListRenderItemInfo, type ViewToken } from 'react-native';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildAvatar, HeartButton, LikeToast, LockGlyph, TimerBadge, Txt } from '@/components';
import { useAppStore, useBedtimeReached } from '@/stores/appStore';
import { useLikedVideoIds } from '@/stores/requestStore';
import { toggleLikeAndSync } from '@/features/family/requestSync';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { useKidPullToRefresh } from '@/features/kid/useKidPullToRefresh';
import { useLivePlaylistVideos, usePlaybackProgress } from '@/stores/playlistStore';
import { remainingSeconds, useSecondsWatchedToday } from '@/stores/timerStore';
import { colors, controls, shadows } from '@/theme/tokens';

const VIDEO_PAGE_SIZE = 6;

interface VideoChoice {
  id: string;
  originalIndex: number;
  providerVideoId: string;
  channelTitle: string;
  title: string;
  thumbnailUrl: string;
  hasSavedProgress: boolean;
  progress: number;
}

function PlayGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden>
      <Path d="M3 1.75 14 8 3 14.25Z" fill={color} />
    </Svg>
  );
}

const VideoRow = memo(function VideoRow({
  item,
  onPlay,
  liked,
  onToggleLike,
  grid = false,
}: {
  item: VideoChoice;
  grid?: boolean;
  onPlay: (index: number) => void;
  liked: boolean;
  onToggleLike: (item: VideoChoice) => void;
}) {
  const handlePress = useCallback(() => onPlay(item.originalIndex), [item.originalIndex, onPlay]);
  const handleLike = useCallback(() => onToggleLike(item), [item, onToggleLike]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.hasSavedProgress ? 'Continue' : 'Play'} ${item.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.videoRow, grid && styles.gridCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.rowThumbnailWrap, grid && { width: '100%' as const, borderRadius: 16 }]}>
        <Image
          source={item.thumbnailUrl}
          recyclingKey={item.id}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
        <View style={[styles.rowPlayButton, grid && styles.gridPlayButton]}>
          <PlayGlyph size={grid ? 22 : 15} color="#FFFFFF" />
        </View>
        {item.progress > 0 ? (
          <View style={styles.rowProgressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
          </View>
        ) : null}
      </View>
      <View style={[styles.rowCopy, grid && styles.gridCopy]}>
        <Txt weight="black" size={grid ? 17 : 14} lineHeight={grid ? 22 : 18} color={colors.parent.night} numberOfLines={grid ? 2 : 3}>
          {item.title}
        </Txt>
        <Txt weight="bold" size={grid ? 13 : 11.5} color={colors.parent.muted} numberOfLines={1}>
          {item.hasSavedProgress ? 'Continue watching' : 'Ready to watch'}
        </Txt>
      </View>
      <View style={[styles.rowHeart, grid && styles.gridHeart]}>
        <HeartButton liked={liked} onToggle={handleLike} />
      </View>
    </Pressable>
  );
});

function FeaturedVideo({
  item,
  onPlay,
  liked,
  onToggleLike,
  thumbnailHeight,
}: {
  item: VideoChoice;
  onPlay: (index: number) => void;
  liked: boolean;
  onToggleLike: (item: VideoChoice) => void;
  /** Caps the poster's height so a full-width hero can't swallow a wide screen. */
  thumbnailHeight?: number;
}) {
  const handlePress = useCallback(() => onPlay(item.originalIndex), [item.originalIndex, onPlay]);
  const handleLike = useCallback(() => onToggleLike(item), [item, onToggleLike]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.hasSavedProgress ? 'Continue' : 'Play'} ${item.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.thumbnailWrap, thumbnailHeight ? { aspectRatio: undefined, height: thumbnailHeight } : null]}>
        <Image
          source={item.thumbnailUrl}
          recyclingKey={item.id}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          priority="high"
        />
        <View style={styles.playButton}>
          <PlayGlyph size={22} color="#FFFFFF" />
        </View>
        <View style={styles.featuredHeart}>
          <HeartButton liked={liked} onToggle={handleLike} />
        </View>
        {item.hasSavedProgress ? (
          <View style={styles.continueBadge}>
            <Txt weight="black" size={11} color={colors.parent.night}>KEEP WATCHING</Txt>
          </View>
        ) : null}
        {item.progress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
          </View>
        ) : null}
      </View>
      <Txt weight="black" size={15} color={colors.parent.night} numberOfLines={2}>
        {item.title}
      </Txt>
    </Pressable>
  );
}

/** A deliberately small child world: greeting, time and approved choices only. */
export default function ChildHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet, width, height } = useResponsiveLayout();
  const contentWidth = width - insets.left - insets.right;
  const { videoColumns } = useResponsiveLayout(contentWidth - 48);
  // The hero spans the full content width like the grid and footer; in landscape
  // a 16:9 poster that wide would eat the screen, so its height is capped (the
  // image is `cover`, so it crops rather than narrowing the card).
  const featuredThumbHeight = isTablet
    ? Math.min(Math.round(((contentWidth - 48) * 9) / 16), Math.round(height * 0.45))
    : undefined;
  const listRef = useRef<FlatList<VideoChoice[]>>(null);
  const scrollOffset = useRef(0);
  const headerHeight = useRef(0);
  const rowHeight = useRef(0);
  const firstVisibleId = useRef<string | null>(null);
  const previousColumns = useRef(videoColumns);
  const pendingRestore = useRef<{ id: string | null; offset: number } | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 1 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<VideoChoice[]>[] }) => {
    if (!pendingRestore.current) firstVisibleId.current = viewableItems[0]?.item[0]?.id ?? null;
  }).current;
  const profile = useAppStore(
    (state) =>
      state.childProfiles.find((candidate) => candidate.id === state.activeChildProfileId) ??
      state.childProfiles[0] ??
      null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const playbackProgress = usePlaybackProgress(profile?.id ?? null);
  const likedVideoIds = useLikedVideoIds(profile?.id ?? null);
  const likedSet = useMemo(() => new Set(likedVideoIds), [likedVideoIds]);
  const [likeToast, setLikeToast] = useState(false);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);
  const pastBedtime = useBedtimeReached(profile?.id ?? null);
  // Kid devices belong to one child and have no grown-up controls on them.
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const pullToRefresh = useKidPullToRefresh();
  const [visibleVideoCount, setVisibleVideoCount] = useState(VIDEO_PAGE_SIZE);
  const featuredIndex = useMemo(() => {
    let latestIndex = -1;
    let latestUpdate = -1;
    videos.forEach((entry, index) => {
      const saved = playbackProgress[entry.video.providerVideoId];
      if (saved && saved.updatedAt > latestUpdate) {
        latestIndex = index;
        latestUpdate = saved.updatedAt;
      }
    });
    return latestIndex >= 0 ? latestIndex : 0;
  }, [videos, playbackProgress]);
  // Put the last-played video first, then keep the parent's playlist order.
  // The first choice is featured visually; the remaining choices stay large
  // enough to be easy for a child to tap.
  const orderedVideos = useMemo(() => {
    const indexed = videos.map((entry, originalIndex) => ({ entry, originalIndex }));
    if (featuredIndex <= 0) return indexed;
    return [indexed[featuredIndex], ...indexed.filter((item) => item.originalIndex !== featuredIndex)];
  }, [featuredIndex, videos]);
  const videoChoices = useMemo<VideoChoice[]>(
    () =>
      orderedVideos.map(({ entry, originalIndex }) => {
        const saved = playbackProgress[entry.video.providerVideoId];
        return {
          id: entry.id,
          originalIndex,
          providerVideoId: entry.video.providerVideoId,
          channelTitle: entry.video.channelTitle,
          title: entry.video.title,
          thumbnailUrl: entry.video.thumbnailUrl,
          hasSavedProgress: Boolean(saved),
          progress: saved?.durationSeconds
            ? Math.min(1, saved.positionSeconds / saved.durationSeconds)
            : 0,
        };
      }),
    [orderedVideos, playbackProgress],
  );
  const featuredVideo = videoChoices[0] ?? null;
  const visibleVideos = useMemo(
    () => videoChoices.slice(1, visibleVideoCount),
    [videoChoices, visibleVideoCount],
  );

  // Group rows ourselves so a column change doesn't remount the virtualized list.
  const rows = useMemo(() => {
    const result: VideoChoice[][] = [];
    for (let i = 0; i < visibleVideos.length; i += videoColumns) result.push(visibleVideos.slice(i, i + videoColumns));
    return result;
  }, [visibleVideos, videoColumns]);
  useLayoutEffect(() => {
    if (previousColumns.current === videoColumns) return;
    pendingRestore.current = {
      id: scrollOffset.current >= headerHeight.current ? firstVisibleId.current : null,
      offset: scrollOffset.current,
    };
    rowHeight.current = 0;
    previousColumns.current = videoColumns;
  }, [videoColumns]);
  const restorePosition = () => {
    const pending = pendingRestore.current;
    if (!pending || (pending.id && !rowHeight.current)) return;
    const index = pending.id ? rows.findIndex((row) => row.some((item) => item.id === pending.id)) : -1;
    const offset = index >= 0 ? headerHeight.current + index * (rowHeight.current + 12) : pending.offset;
    listRef.current?.scrollToOffset({ offset, animated: false });
    pendingRestore.current = null;
  };

  useEffect(() => {
    if (pastBedtime) {
      router.replace({ pathname: '/(child)/times-up', params: { reason: 'bedtime' } });
      return;
    }
    if (remaining !== null && remaining <= 0) router.replace('/(child)/times-up');
  }, [pastBedtime, remaining, router]);

  const play = useCallback((index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(child)/player', params: { index: String(index) } });
  }, [router]);

  const toggleLike = useCallback(
    (item: VideoChoice) => {
      if (!profile) return;
      const nowLiked = toggleLikeAndSync(profile.id, {
        providerVideoId: item.providerVideoId,
        channelTitle: item.channelTitle,
        thumbnailUrl: item.thumbnailUrl,
      });
      if (nowLiked) {
        setLikeToast(true);
        setTimeout(() => setLikeToast(false), 1800);
      }
    },
    [profile],
  );

  const switchProfile = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/whos-watching');
  }, [router]);

  const openGrownups = useCallback(() => router.push('/pin-unlock'), [router]);

  const askForMore = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(child)/request');
  }, [router]);

  const loadMoreVideos = useCallback(() => {
    setVisibleVideoCount((current) => Math.min(current + VIDEO_PAGE_SIZE, videoChoices.length));
  }, [videoChoices.length]);

  const renderVideo = useCallback(
    ({ item }: ListRenderItemInfo<VideoChoice[]>) => (
      <View style={{ flexDirection: 'row', gap: 16 }} onLayout={(event) => { rowHeight.current = event.nativeEvent.layout.height; }}>
        {item.map((video) => (
          <View key={video.id} style={{ width: (contentWidth - 48 - (videoColumns - 1) * 16) / videoColumns }}>
            <VideoRow item={video} onPlay={play} liked={likedSet.has(video.providerVideoId)} onToggleLike={toggleLike} grid={videoColumns > 1} />
          </View>
        ))}
      </View>
    ),
    [play, likedSet, toggleLike, videoColumns, contentWidth],
  );
  const keyExtractor = useCallback((row: VideoChoice[]) => row[0].id, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.child.sky, '#7FD4E8', colors.child.cream]}
        locations={[0, 0.72, 1]}
        style={[styles.headerBackdrop, { height: insets.top + 250 }]}
      />
      {/* Greeting and time left stay put while the choices scroll underneath. */}
      <View style={[styles.stickyHeader, { width: contentWidth, paddingTop: insets.top + 18 }]}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Txt weight="black" size={30} color={colors.parent.night} numberOfLines={1}>
              Hi, {profile?.nickname ?? 'friend'}!
            </Txt>
            <Txt weight="bold" size={17} color={colors.parent.night}>
              Pick a video
            </Txt>
          </View>
          <View style={styles.headerActions}>
            {kidDevice ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Grown-ups"
                onPress={openGrownups}
                style={({ pressed }) => [styles.grownups, pressed && styles.grownupsPressed]}
              >
                <LockGlyph color="#716878" scale={0.65} />
                <Txt weight="black" size={11.5} color="#716878">Grown-ups</Txt>
              </Pressable>
            )}
            {kidDevice ? (
              <View style={styles.avatar}>
                {profile ? <ChildAvatar avatar={profile.avatar} size={50} /> : null}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch child profile"
                onPress={switchProfile}
                style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
              >
                {profile ? <ChildAvatar avatar={profile.avatar} size={50} /> : null}
              </Pressable>
            )}
          </View>
        </View>

        <TimerBadge
          remainingSeconds={remaining}
          totalSeconds={profile?.dailyLimitMinutes ? profile.dailyLimitMinutes * 60 : null}
        />
      </View>
      <FlatList
        ref={listRef}
        data={rows}
        onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onContentSizeChange={restorePosition}
        extraData={videoColumns}
        renderItem={renderVideo}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={VideoSeparator}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40, width: contentWidth }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          pullToRefresh ? (
            <RefreshControl
              refreshing={pullToRefresh.refreshing}
              onRefresh={pullToRefresh.onRefresh}
              tintColor={colors.parent.night}
              colors={[colors.primaryDark]}
            />
          ) : undefined
        }
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.45}
        initialNumToRender={VIDEO_PAGE_SIZE - 1}
        maxToRenderPerBatch={VIDEO_PAGE_SIZE}
        windowSize={5}
        ListFooterComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask a grown-up for more videos"
            onPress={askForMore}
            style={({ pressed }) => [styles.askMore, pressed && styles.cardPressed]}
          >
            <Txt weight="black" size={22}>
              💛
            </Txt>
            <Txt weight="black" size={15} color={colors.parent.night}>
              Want more? Ask a grown-up
            </Txt>
          </Pressable>
        }
        ListHeaderComponent={(
          <View style={styles.listHeader} onLayout={(event) => { headerHeight.current = event.nativeEvent.layout.height; }}>
            {featuredVideo ? (
              <FeaturedVideo
                thumbnailHeight={featuredThumbHeight}
                item={featuredVideo}
                onPlay={play}
                liked={likedSet.has(featuredVideo.providerVideoId)}
                onToggleLike={toggleLike}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Txt weight="black" size={20} color={colors.parent.night} center>
                  No videos are ready yet
                </Txt>
                <Txt weight="bold" size={14} color={colors.parent.muted} center>
                  Ask a grown-up to add one for you.
                </Txt>
              </View>
            )}
            {visibleVideos.length > 0 ? (
              <Txt weight="black" size={16} color={colors.parent.night}>
                More videos
              </Txt>
            ) : null}
          </View>
        )}
      />
      {likeToast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 28 }]}>
          <LikeToast text="Told your grown-up 💛" />
        </View>
      ) : null}
    </View>
  );
}

function VideoSeparator() {
  return <View style={styles.videoSeparator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream },
  headerBackdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  listHeader: { gap: 20, paddingTop: 16, paddingBottom: 14 },
  // Sits above the list so its soft edge reads as a scroll boundary.
  stickyHeader: { paddingHorizontal: 24, paddingBottom: 12, gap: 16, zIndex: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  greeting: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  emptyCard: { minHeight: 150, padding: 24, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  featuredCard: {
    minHeight: controls.minTouchChild,
    padding: 9,
    gap: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    ...shadows.cardLg,
  },
  gridCard: { flexDirection: 'column', alignItems: 'stretch', flexGrow: 1, padding: 10, paddingBottom: 14, borderRadius: 22, gap: 10 },
  gridCopy: { flex: 1, width: '100%', gap: 4 },
  gridPlayButton: { width: 58, height: 58, marginLeft: -29, marginTop: -29, borderRadius: 29, borderWidth: 4 },
  gridHeart: { position: 'absolute', top: 18, right: 18 },
  videoRow: {
    minHeight: 98,
    padding: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  videoSeparator: { height: 12 },
  askMore: {
    minHeight: controls.minTouchChild,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.card,
  },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#DDEEFE',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 29,
    backgroundColor: 'rgba(255,107,87,.94)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumbnailWrap: {
    width: '43%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#DDEEFE',
  },
  rowPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,87,.94)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 6 },
  rowHeart: { alignSelf: 'center' },
  featuredHeart: { position: 'absolute', top: 10, right: 10 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  continueBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderRadius: 99,
    backgroundColor: colors.child.sun,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, backgroundColor: 'rgba(255,255,255,.45)' },
  rowProgressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: 'rgba(255,255,255,.45)' },
  progressFill: { height: '100%', backgroundColor: colors.child.sun },
  grownups: {
    minHeight: controls.minTouchParent,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  grownupsPressed: { opacity: 0.7 },
});

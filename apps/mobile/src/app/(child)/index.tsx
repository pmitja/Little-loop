import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildAvatar, LockGlyph, TimerBadge, Txt } from '@/components';
import { useAppStore, useBedtimeReached } from '@/stores/appStore';
import { useLivePlaylistVideos, usePlaybackProgress } from '@/stores/playlistStore';
import { remainingSeconds, useSecondsWatchedToday } from '@/stores/timerStore';
import { colors, controls, shadows } from '@/theme/tokens';

const VIDEO_PAGE_SIZE = 6;

interface VideoChoice {
  id: string;
  originalIndex: number;
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
}: {
  item: VideoChoice;
  onPlay: (index: number) => void;
}) {
  const handlePress = useCallback(() => onPlay(item.originalIndex), [item.originalIndex, onPlay]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.hasSavedProgress ? 'Continue' : 'Play'} ${item.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.videoRow, pressed && styles.cardPressed]}
    >
      <View style={styles.rowThumbnailWrap}>
        <Image
          source={item.thumbnailUrl}
          recyclingKey={item.id}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.rowPlayButton}>
          <PlayGlyph size={15} color="#FFFFFF" />
        </View>
        {item.progress > 0 ? (
          <View style={styles.rowProgressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
          </View>
        ) : null}
      </View>
      <View style={styles.rowCopy}>
        <Txt weight="black" size={14} lineHeight={18} color={colors.parent.night} numberOfLines={3}>
          {item.title}
        </Txt>
        <Txt weight="bold" size={11.5} color={colors.parent.muted} numberOfLines={1}>
          {item.hasSavedProgress ? 'Continue watching' : 'Ready to watch'}
        </Txt>
      </View>
    </Pressable>
  );
});

function FeaturedVideo({ item, onPlay }: { item: VideoChoice; onPlay: (index: number) => void }) {
  const handlePress = useCallback(() => onPlay(item.originalIndex), [item.originalIndex, onPlay]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.hasSavedProgress ? 'Continue' : 'Play'} ${item.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}
    >
      <View style={styles.thumbnailWrap}>
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
  const profile = useAppStore(
    (state) =>
      state.childProfiles.find((candidate) => candidate.id === state.activeChildProfileId) ??
      state.childProfiles[0] ??
      null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const playbackProgress = usePlaybackProgress(profile?.id ?? null);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);
  const pastBedtime = useBedtimeReached(profile?.id ?? null);
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
    ({ item }: ListRenderItemInfo<VideoChoice>) => <VideoRow item={item} onPlay={play} />,
    [play],
  );

  const keyExtractor = useCallback((item: VideoChoice) => item.id, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.child.sky, '#7FD4E8']}
        style={[styles.headerBackdrop, { height: insets.top + 250 }]}
      />
      <FlatList
        data={visibleVideos}
        renderItem={renderVideo}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={VideoSeparator}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.listHeader}>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Grown-ups"
                  onPress={openGrownups}
                  style={({ pressed }) => [styles.grownups, pressed && styles.grownupsPressed]}
                >
                  <LockGlyph color="#716878" scale={0.65} />
                  <Txt weight="black" size={11.5} color="#716878">Grown-ups</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Switch child profile"
                  onPress={switchProfile}
                  style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
                >
                  {profile ? <ChildAvatar avatar={profile.avatar} size={50} /> : null}
                </Pressable>
              </View>
            </View>

            <TimerBadge
              remainingSeconds={remaining}
              totalSeconds={profile?.dailyLimitMinutes ? profile.dailyLimitMinutes * 60 : null}
            />

            {featuredVideo ? (
              <FeaturedVideo item={featuredVideo} onPlay={play} />
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
  listHeader: { gap: 20, paddingBottom: 14 },
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

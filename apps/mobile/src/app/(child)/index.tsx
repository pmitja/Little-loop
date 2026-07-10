import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { formatDuration } from '@littleloop/shared';
import { ChildAvatar, TimerBadge, Txt } from '@/components';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos, usePlaybackProgress } from '@/stores/playlistStore';
import { remainingSeconds, useSecondsWatchedToday } from '@/stores/timerStore';
import { colors, controls, shadows } from '@/theme/tokens';

function PlayGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden>
      <Path d="M3 1.75 14 8 3 14.25Z" fill={color} />
    </Svg>
  );
}

/** A deliberately small child world: greeting, time and approved choices only. */
export default function ChildHome() {
  const router = useRouter();
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
  const featured = videos[featuredIndex];
  const featuredProgress = featured
    ? playbackProgress[featured.video.providerVideoId]
    : undefined;
  const featuredProgressRatio = featuredProgress?.durationSeconds
    ? Math.min(1, featuredProgress.positionSeconds / featuredProgress.durationSeconds)
    : 0;
  const moreVideos = videos
    .map((entry, originalIndex) => ({ entry, originalIndex }))
    .filter(({ originalIndex }) => originalIndex !== featuredIndex);

  useEffect(() => {
    if (remaining !== null && remaining <= 0) router.replace('/(child)/times-up');
  }, [remaining, router]);

  const play = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(child)/player', params: { index: String(index) } });
  };

  const switchProfile = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/whos-watching');
  };

  return (
    <LinearGradient
      colors={[colors.child.sky, '#7FD4E8', colors.child.cream, colors.child.cream]}
      locations={[0, 0.46, 0.461, 1]}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Txt weight="black" size={29} color="#FFFFFF">
              Hi, {profile?.nickname ?? 'friend'}! ☀️
            </Txt>
            <Txt weight="bold" size={14} color="rgba(255,255,255,.85)">
              Pick something fun
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch child profile"
            onPress={switchProfile}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            {profile ? (
              <ChildAvatar avatar={profile.avatar} size={40} />
            ) : (
              <Txt size={30}>🦊</Txt>
            )}
          </Pressable>
        </View>

        <TimerBadge
          remainingSeconds={remaining}
          totalSeconds={profile?.dailyLimitMinutes ? profile.dailyLimitMinutes * 60 : null}
        />

        {featured ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play featured video ${featured.video.title}`}
            onPress={() => play(featuredIndex)}
            style={({ pressed }) => [styles.featured, pressed && styles.pressed]}
          >
            <Image
              source={{ uri: featured.video.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
            <LinearGradient
              colors={['transparent', 'rgba(20,31,50,.88)']}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.featuredLabel}>
              <Txt weight="black" size={11} color={colors.child.skyDeep}>
                {featuredProgress ? 'CONTINUE' : 'UP FIRST'}
              </Txt>
            </View>
            {featuredProgress ? (
              <View style={styles.featuredProgressTrack}>
                <View
                  style={[
                    styles.featuredProgressFill,
                    { width: `${featuredProgressRatio * 100}%` },
                  ]}
                />
              </View>
            ) : null}
            <View style={styles.featuredCopy}>
              <Txt
                weight="black"
                size={18}
                color="#FFFFFF"
                numberOfLines={2}
                style={styles.featuredTitle}
              >
                {featured.video.title}
              </Txt>
              <View style={styles.featuredPlay}>
                <PlayGlyph size={18} color={colors.child.coral} />
              </View>
            </View>
          </Pressable>
        ) : null}

        {moreVideos.length > 0 ? (
          <View style={styles.moreSection}>
            <Txt weight="black" size={18} color={colors.parent.night}>
              More fun
            </Txt>
            <View style={styles.list}>
              {moreVideos.map(({ entry, originalIndex }) => {
                const saved = playbackProgress[entry.video.providerVideoId];
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${entry.video.title}`}
                    onPress={() => play(originalIndex)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Image
                      source={{ uri: entry.video.thumbnailUrl }}
                      style={styles.rowThumbnail}
                      contentFit="cover"
                      transition={150}
                    />
                    <View style={styles.rowCopy}>
                      <Txt
                        weight="black"
                        size={15}
                        color={colors.parent.night}
                        numberOfLines={2}
                      >
                        {entry.video.title}
                      </Txt>
                      <Txt weight="bold" size={11} color={colors.parent.muted}>
                        {saved
                          ? `Continue at ${formatDuration(Math.floor(saved.positionSeconds))}`
                          : 'Tap to watch'}
                      </Txt>
                    </View>
                    <View style={styles.rowPlay}>
                      <PlayGlyph size={14} color={colors.child.coral} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Grown-ups"
          onPress={() => router.push('/pin-unlock')}
          style={({ pressed }) => [styles.grownups, pressed && styles.grownupsPressed]}
        >
          <Txt weight="bold" size={13} color="#9A8FA5">
            🔒 Grown-ups
          </Txt>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 66,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  greeting: { flex: 1 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.child.sun,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  featured: {
    width: '100%',
    aspectRatio: 16 / 9,
    minHeight: controls.minTouchChild,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#DDEEFE',
    ...shadows.cardLg,
  },
  featuredLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,.92)',
  },
  featuredCopy: {
    position: 'absolute',
    left: 16,
    right: 14,
    bottom: 14,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  featuredTitle: { flex: 1 },
  featuredPlay: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    backgroundColor: 'rgba(255,255,255,.28)',
  },
  featuredProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.child.sun,
  },
  moreSection: { gap: 10 },
  list: { gap: 10 },
  row: {
    minHeight: 82,
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.96)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  rowPressed: { opacity: 0.78 },
  rowThumbnail: {
    width: 112,
    height: 66,
    borderRadius: 12,
    backgroundColor: '#DDEEFE',
  },
  rowCopy: { flex: 1, gap: 3 },
  rowPlay: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 18,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grownups: {
    alignSelf: 'center',
    minHeight: controls.minTouchParent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 99,
    backgroundColor: '#F1EAE0',
    justifyContent: 'center',
  },
  grownupsPressed: { opacity: 0.7 },
});

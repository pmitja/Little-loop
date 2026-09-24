import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import {
  AnimatedFill,
  AppIcon,
  Appear,
  Breathe,
  ChildSwitcher,
  PressableScale,
  ScreenContainer,
  Txt,
  WeekBars,
} from '@/components';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { apiConfigured } from '@/lib/api';
import { fetchSharedActivity } from '@/features/family/activityApi';
import { colors, controls, shadows } from '@/theme/tokens';
import { useAppStore, useChildRules } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePendingRequests } from '@/stores/requestStore';
import { useSecondsWatchedToday, useTimerStore, videosWatchedToday, weeklyMinutes } from '@/stores/timerStore';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dayLetter(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return DAY_LETTERS[new Date(y, m - 1, d).getDay()];
}

/** Today: how much has been watched, what needs the parent, and the week at a glance. */
export default function Today() {
  const router = useRouter();
  const [contentWidth, setContentWidth] = useState(0);
  const { dashboardColumns } = useResponsiveLayout(contentWidth);
  const profiles = useAppStore((s) => s.childProfiles);
  const activeId = useAppStore((s) => s.activeChildProfileId);
  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  const rules = useChildRules(profile?.id ?? null);
  const videos = usePlaylistVideos(profile?.id ?? null);
  const requests = usePendingRequests(profile?.id ?? null);
  const sessions = useTimerStore((s) => s.sessions);
  const seconds = useSecondsWatchedToday(profile?.id ?? null);
  const shared = useQuery({
    queryKey: ['activity', profile?.id],
    queryFn: () => fetchSharedActivity(profile!.id),
    enabled: Boolean(profile && apiConfigured()),
  });

  const name = profile?.nickname ?? 'your child';
  const minutes = shared.data?.todayMinutes ?? Math.floor(seconds / 60);
  const limit = profile?.dailyLimitMinutes ?? null;
  const left = limit === null ? null : Math.max(0, limit - minutes);
  const liveCount = videos.filter((video) => (video.status ?? 'live') === 'live').length;
  const waiting = videos.filter((video) => video.status === 'review').length + requests.length;
  const week = shared.data
    ? shared.data.weekByDay.map((day) => ({ key: day.date, minutes: day.minutes }))
    : weeklyMinutes(sessions, profile?.id ?? null);
  const weekAvg = Math.round(week.reduce((sum, day) => sum + day.minutes, 0) / Math.max(1, week.length));
  const watchedToday = videosWatchedToday(sessions, profile?.id ?? null)
    .map((id) => videos.find((video) => video.video.providerVideoId === id))
    .filter((video): video is NonNullable<typeof video> => video != null);
  const requestLine = requests[0]
    ? requests[0].kind === 'channel' && requests[0].channelTitle
      ? `${name} asked for more from ${requests[0].channelTitle}`
      : `${name} asked for more videos`
    : 'Approve them before they reach child mode';

  const footnote = [
    left === null ? 'No daily limit' : `${left} min left`,
    rules.bedtimeEnabled ? `bedtime at ${rules.bedtime}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenContainer scroll style={styles.root}>
      <Appear index={0} style={styles.titleRow}>
        <Txt weight="black" size={32}>Today</Txt>
        <Txt weight="extrabold" size={13} color={colors.parent.muted}>
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </Txt>
      </Appear>
      <Appear index={1}>
        <ChildSwitcher
          profiles={profiles}
          activeId={profile?.id ?? null}
          onSelect={(id) => useAppStore.getState().setActiveChildProfileId(id)}
          onAdd={() => router.push('/(parent)/add-child')}
          onEdit={(id) => router.push({ pathname: '/(parent)/edit-child', params: { id } })}
        />
      </Appear>

      <View
        onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
        style={[styles.dashboard, dashboardColumns && styles.columns]}
      >
        <View style={[styles.column, dashboardColumns && { flex: 1 }]}>
          <Appear index={2} style={styles.hero}>
            <View style={[styles.statusPill, liveCount === 0 && styles.statusPillIdle]}>
              {liveCount > 0 ? (
                <Breathe from={0.8} to={1.2} duration={900} fade>
                  <View style={styles.liveDot} />
                </Breathe>
              ) : (
                <View style={[styles.liveDot, { backgroundColor: colors.amber }]} />
              )}
              <Txt weight="extrabold" size={12.5} color={liveCount > 0 ? colors.greenDark : colors.amberText}>
                {liveCount > 0
                  ? `${liveCount} ${liveCount === 1 ? 'video' : 'videos'} ready for ${name}`
                  : `Add a video for ${name}`}
              </Txt>
            </View>
            <View style={styles.bigRow}>
              <Txt weight="black" size={48} lineHeight={52}>{minutes} min</Txt>
              {limit !== null ? (
                <Txt weight="extrabold" size={15} color={colors.parent.muted}>of {limit} today</Txt>
              ) : null}
            </View>
            <View style={styles.track}>
              <AnimatedFill progress={limit ? minutes / limit : 0} style={styles.fill}>
                <LinearGradient
                  colors={[colors.child.grass, colors.child.sun]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </AnimatedFill>
            </View>
            <Txt weight="bold" size={13.5} color={colors.parent.muted}>{footnote}</Txt>
          </Appear>

          {waiting > 0 ? (
            <Appear index={3}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${waiting} waiting for you. Review.`}
                onPress={() => router.navigate('/(parent)/(tabs)/playlist')}
                pressedScale={0.98}
                style={styles.needs}
              >
                <View style={styles.stack}>
                  <Image source={videos.find((v) => v.status === 'review')?.video.thumbnailUrl ?? requests[0]?.thumbnailUrl} style={styles.stackThumb} />
                  <View style={[styles.stackThumb, styles.stackBack]}>
                    <AppIcon name="videos" size={28} />
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Txt weight="black" size={16}>
                    {waiting} {waiting === 1 ? 'thing needs' : 'things need'} you
                  </Txt>
                  <Txt weight="bold" size={12.5} lineHeight={17} color={colors.amberText} numberOfLines={2}>
                    {requestLine}
                  </Txt>
                </View>
                <View style={styles.reviewBtn}>
                  <Txt weight="black" size={14} color="#FFFFFF">Review</Txt>
                </View>
              </PressableScale>
            </Appear>
          ) : liveCount === 0 ? (
            <Appear index={3}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Add a video"
                onPress={() => router.push('/(parent)/add-video')}
                pressedScale={0.98}
                style={styles.addCard}
              >
                <AppIcon name="add-video" size={44} style={{ borderRadius: 12 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt weight="black" size={16}>Add {name}’s first video</Txt>
                  <Txt weight="bold" size={12.5} color={colors.child.skyDeep}>Paste a YouTube link</Txt>
                </View>
                <Txt weight="black" size={22} color={colors.subtle}>›</Txt>
              </PressableScale>
            </Appear>
          ) : null}
        </View>

        <View style={[styles.column, dashboardColumns && { flex: 1 }]}>
          <Appear index={4}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="See all activity"
              onPress={() => router.push('/(parent)/(tabs)/activity')}
              pressedScale={0.99}
              style={styles.weekCard}
            >
              <View style={styles.weekHead}>
                <Txt weight="black" size={16}>This week</Txt>
                <Txt weight="bold" size={13} color={colors.parent.muted}>avg {weekAvg} min ›</Txt>
              </View>
              <WeekBars values={week.map((d) => d.minutes)} labels={week.map((d) => dayLetter(d.key))} />
            </PressableScale>
          </Appear>

          {watchedToday.length > 0 ? (
            <Appear index={5} style={styles.watched}>
              <Txt weight="black" size={16}>Watched today</Txt>
              {watchedToday.slice(0, 4).map((v) => (
                <View key={v.id} style={styles.watchedRow}>
                  <Image source={{ uri: v.video.thumbnailUrl }} style={styles.watchedThumb} transition={150} />
                  <Txt weight="extrabold" size={14} numberOfLines={1} style={{ flex: 1 }}>{v.video.title}</Txt>
                </View>
              ))}
            </Appear>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dashboard: { gap: 16 },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: 16 },
  hero: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 12, ...shadows.cardLg },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: colors.greenTint,
  },
  statusPillIdle: { backgroundColor: colors.amberTint },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  track: { height: 12, borderRadius: 6, backgroundColor: '#EEEAE3', overflow: 'hidden' },
  fill: { borderRadius: 6 },
  needs: {
    backgroundColor: colors.amberTint,
    borderWidth: 1.5,
    borderColor: '#FFE3A3',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stack: { width: 76, height: 48 },
  stackThumb: {
    position: 'absolute',
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.amberTint,
    backgroundColor: '#FFE4DD',
  },
  stackBack: { left: 0, right: undefined, zIndex: -1, backgroundColor: '#DDF3E4', alignItems: 'center', justifyContent: 'center' },
  reviewBtn: {
    height: controls.minTouchParent,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.parent.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.child.skyDeep,
    backgroundColor: colors.primaryTint,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, paddingBottom: 14, gap: 14, ...shadows.card },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  watched: { gap: 10 },
  watchedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8, ...shadows.card },
  watchedThumb: { width: 62, height: 42, borderRadius: 10, backgroundColor: colors.primaryTint },
});

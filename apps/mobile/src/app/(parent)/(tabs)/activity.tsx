import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { Card, ScreenContainer, SectionLabel, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import {
  todayKey,
  useSecondsWatchedToday,
  useTimerStore,
  type WatchSession,
} from '@/stores/timerStore';

function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(iso: string): string {
  const key = localDayKey(iso);
  const now = new Date();
  if (key === todayKey()) return 'Today';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === localDayKey(yesterday.toISOString())) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Last 7 local days (oldest first), each with total minutes watched. */
function weekBars(sessions: WatchSession[], childId: string | null): { key: string; minutes: number }[] {
  const days: { key: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ key: localDayKey(d.toISOString()), minutes: 0 });
  }
  for (const s of sessions) {
    if (childId && s.childProfileId !== childId) continue;
    const day = days.find((d) => d.key === localDayKey(s.startedAt));
    if (day) day.minutes += s.seconds / 60;
  }
  return days;
}

/** s17 — activity: today vs limit, 7-day bars, most watched, session list (local data). */
export default function Activity() {
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const sessions = useTimerStore((s) => s.sessions);
  const videos = usePlaylistVideos(profile?.id ?? null);
  const secondsToday = useSecondsWatchedToday(profile?.id ?? null);
  const minutesToday = Math.floor(secondsToday / 60);
  const limit = profile?.dailyLimitMinutes ?? null;

  const childSessions = sessions.filter(
    (s) => (!profile || s.childProfileId === profile.id) && s.seconds > 0,
  );
  const recent = [...childSessions].reverse().slice(0, 8);
  const bars = weekBars(sessions, profile?.id ?? null);
  const maxBar = Math.max(1, ...bars.map((b) => b.minutes));

  // Most-watched: play counts across the week's sessions, resolved against the playlist.
  const counts = new Map<string, number>();
  for (const s of childSessions) {
    for (const id of s.videoIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const [topVideoId, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const topVideo = topVideoId
    ? (videos.find((v) => v.video.providerVideoId === topVideoId)?.video ?? null)
    : null;

  const statusLine =
    limit === null
      ? 'No daily limit set'
      : minutesToday <= limit
        ? `Under the ${limit} min limit`
        : `Over the ${limit} min limit`;

  return (
    <ScreenContainer scroll style={styles.container}>
      <Txt weight="black" size={24}>
        Activity
      </Txt>
      <Txt weight="semibold" size={13.5} color={colors.muted} style={{ marginBottom: 16 }}>
        {profile ? `${profile.nickname} · stored only on this device` : 'stored only on this device'}
      </Txt>

      <View style={styles.statsRow}>
        <Card radius={22} padding={16} style={styles.statCard}>
          <Txt weight="semibold" size={12.5} color={colors.subtle}>
            Today
          </Txt>
          <View style={styles.todayRow}>
            <Txt weight="black" size={26}>
              {minutesToday}
            </Txt>
            <Txt weight="extrabold" size={14} color={colors.muted}>
              {' '}
              min
            </Txt>
          </View>
          <Txt
            weight="bold"
            size={11.5}
            color={limit !== null && minutesToday > limit ? colors.red : colors.greenDark}
            style={{ marginTop: 4 }}
          >
            {statusLine}
          </Txt>
        </Card>
        <Card radius={22} padding={16} style={styles.statCard}>
          <Txt weight="semibold" size={12.5} color={colors.subtle}>
            This week
          </Txt>
          <View style={styles.barsRow}>
            {bars.map((b, i) => (
              <View
                key={b.key}
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(8, Math.round((b.minutes / maxBar) * 100))}%`,
                    backgroundColor: i === bars.length - 1 ? colors.primary : '#DCEBFD',
                  },
                ]}
              />
            ))}
          </View>
        </Card>
      </View>

      {topVideoId ? (
        <>
          <SectionLabel style={styles.sectionLabel}>Most watched</SectionLabel>
          <Card radius={radii.card} padding={12} style={styles.mostWatched}>
            <View style={styles.mostThumb}>
              {topVideo ? (
                <Image
                  source={{ uri: topVideo.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <Svg width={22} height={14} viewBox="0 0 22 14" style={styles.mostPlay}>
                  <Path d="M4 0 L18 7 L4 14 Z" fill="rgba(255,138,122,.9)" />
                </Svg>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="extrabold" size={13.5} numberOfLines={1}>
                {topVideo?.title ?? 'A video no longer in the playlist'}
              </Txt>
              <Txt weight="semibold" size={11.5} color={colors.subtle} style={{ marginTop: 3 }}>
                Watched {topCount} {topCount === 1 ? 'time' : 'times'} this week
              </Txt>
            </View>
          </Card>
        </>
      ) : null}

      <SectionLabel style={styles.sectionLabel}>Sessions</SectionLabel>
      {recent.length === 0 ? (
        <Card radius={radii.card} padding={20}>
          <Txt weight="semibold" size={13.5} color={colors.muted} center lineHeight={20}>
            No watch sessions yet. Totals appear here after your child’s first child-mode session.
          </Txt>
        </Card>
      ) : (
        <Card radius={radii.card} padding={0} style={{ overflow: 'hidden' }}>
          {recent.map((s, i) => (
            <View key={s.id} style={[styles.sessionRow, i > 0 ? styles.sessionBorder : null]}>
              <Txt weight="bold" size={13.5}>
                {dayLabel(s.startedAt)}, {timeLabel(s.startedAt)}
              </Txt>
              <Txt weight="bold" size={13} color={colors.muted}>
                {Math.max(1, Math.round(s.seconds / 60))} min · {s.videoIds.length}{' '}
                {s.videoIds.length === 1 ? 'video' : 'videos'}
              </Txt>
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, minHeight: 96 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 38,
    marginTop: 10,
  },
  bar: { flex: 1, borderRadius: 3 },
  sectionLabel: { marginTop: 20, marginBottom: 10 },
  mostWatched: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mostThumb: {
    width: 86,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFE4DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostPlay: { alignSelf: 'center' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sessionBorder: { borderTopWidth: 1, borderTopColor: '#F0F2F6' },
});

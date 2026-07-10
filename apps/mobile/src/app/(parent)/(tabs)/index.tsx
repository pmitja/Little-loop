import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Card, ChildSwitcher, ParentHeader, ScreenContainer, Txt, WeekBars } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { useSecondsWatchedToday, useTimerStore, videosWatchedToday, weeklyMinutes } from '@/stores/timerStore';

export default function Today() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.childProfiles);
  const activeId = useAppStore((s) => s.activeChildProfileId);
  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  const videos = usePlaylistVideos(profile?.id ?? null);
  const sessions = useTimerStore((s) => s.sessions);
  const seconds = useSecondsWatchedToday(profile?.id ?? null);
  const min = Math.floor(seconds / 60);
  const limit = profile?.dailyLimitMinutes ?? 45;

  // Real device-local data: 7-day bars and today's distinct watched videos.
  const week = useMemo(
    () => weeklyMinutes(sessions, profile?.id ?? null).map((d) => Math.round(d.minutes)),
    [sessions, profile?.id],
  );
  const watched = useMemo(() => {
    const ids = videosWatchedToday(sessions, profile?.id ?? null);
    return ids
      .map((id) => videos.find((v) => v.video.providerVideoId === id))
      .filter((v): v is NonNullable<typeof v> => v != null);
  }, [sessions, profile?.id, videos]);

  return (
    <ScreenContainer scroll style={styles.root}>
      <ParentHeader
        title="Today"
        right={
          <Pressable onPress={() => router.push('/whos-watching')} style={styles.handoff}>
            <Txt weight="black" size={12} color="#fff">Hand over</Txt>
          </Pressable>
        }
      />
      <View style={{ height: 14 }} />
      <ChildSwitcher
        profiles={profiles}
        activeId={profile?.id ?? null}
        onSelect={(id) => useAppStore.getState().setActiveChildProfileId(id)}
        onAdd={() => router.push('/(parent)/add-child')}
      />
      <Card large style={styles.hero}>
        <Txt weight="bold" size={14} color={colors.parent.muted}>WATCHED TODAY</Txt>
        <Txt weight="black" size={46}>{min} min</Txt>
        <Txt weight="bold" size={14} color={min > limit ? colors.red : colors.child.grass}>
          {min > limit ? `${min - limit} min over the ${limit} min limit` : `${limit - min} min left of ${limit}`}
        </Txt>
      </Card>
      <Pressable onPress={() => router.push('/(parent)/(tabs)/activity')}>
        <Card style={styles.week}>
          <View style={styles.weekHeader}>
            <Txt weight="black" size={16}>This week</Txt>
            <Txt size={18} color={colors.parent.muted}>›</Txt>
          </View>
          <WeekBars values={week} />
        </Card>
      </Pressable>
      <View style={styles.section}>
        <Txt weight="black" size={17}>Watched today</Txt>
        {watched.length === 0 ? (
          <Txt weight="semibold" size={13.5} color={colors.parent.muted}>
            Nothing watched yet today.
          </Txt>
        ) : (
          watched.slice(0, 4).map((v) => (
            <View key={v.id} style={styles.video}>
              <Image source={{ uri: v.video.thumbnailUrl }} style={styles.thumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight="bold" numberOfLines={1}>{v.video.title}</Txt>
                <Txt size={12} color={colors.parent.muted}>watched today</Txt>
              </View>
            </View>
          ))
        )}
      </View>
      <Button
        title={`Adjust daily limit${profile ? ` for ${profile.nickname}` : ''}`}
        onPress={() => router.push('/(parent)/time-limit')}
        style={{ marginTop: 6 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  handoff: { backgroundColor: colors.parent.night, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 },
  hero: { gap: 3, padding: 20 },
  week: { padding: 18, gap: 6 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: 10 },
  video: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 6 },
  thumb: { width: 62, height: 42, borderRadius: 9, backgroundColor: '#ddd' },
});

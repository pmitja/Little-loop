import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { AppIcon, Card, ChildAvatar, ChildSwitcher, ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { useSecondsWatchedToday, useTimerStore, videosWatchedToday } from '@/stores/timerStore';

export default function Home() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.childProfiles);
  const activeId = useAppStore((s) => s.activeChildProfileId);
  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  const videos = usePlaylistVideos(profile?.id ?? null);
  const sessions = useTimerStore((s) => s.sessions);
  const seconds = useSecondsWatchedToday(profile?.id ?? null);
  const min = Math.floor(seconds / 60);
  const limit = profile?.dailyLimitMinutes ?? 45;

  const watched = videosWatchedToday(sessions, profile?.id ?? null)
    .map((id) => videos.find((video) => video.video.providerVideoId === id))
    .filter((video): video is NonNullable<typeof video> => video != null);
  const approvedCount = videos.filter((video) => (video.status ?? 'live') === 'live').length;
  const ready = approvedCount > 0;

  return (
    <ScreenContainer scroll style={styles.root}>
      {/* The "Hand over" chip that used to sit here is now the persistent Child Mode
          bar above the tab bar, where it is visible from every parent screen. */}
      <ParentHeader title="Home" />
      <ChildSwitcher
        profiles={profiles}
        activeId={profile?.id ?? null}
        onSelect={(id) => useAppStore.getState().setActiveChildProfileId(id)}
        onAdd={() => router.push('/(parent)/add-child')}
        onEdit={(id) => router.push({ pathname: '/(parent)/edit-child', params: { id } })}
      />
      <Card large style={[styles.hero, ready ? styles.heroReady : styles.heroNeedsVideo]}>
        <View style={styles.heroTop}>
          {profile ? (
            <View style={styles.avatar}><ChildAvatar avatar={profile.avatar} size={58} /></View>
          ) : null}
          <View style={styles.heroCopy}>
            <Txt weight="black" size={23}>{ready ? `${profile?.nickname} is ready` : 'Add the first video'}</Txt>
            <Txt weight="bold" size={14} color={colors.parent.muted}>
              {ready ? `${approvedCount} approved · ${Math.max(0, limit - min)} min left today` : 'Choose one safe video to get started.'}
            </Txt>
          </View>
        </View>
        <View style={styles.checks}>
          <View style={styles.check}><Txt weight="black" size={13} color={ready ? colors.greenDark : colors.parent.muted}>{ready ? '✓' : '1'} Videos</Txt></View>
          <View style={styles.check}><Txt weight="black" size={13} color={colors.greenDark}>✓ {limit} min limit</Txt></View>
          <View style={styles.check}><Txt weight="black" size={13} color={colors.greenDark}>✓ PIN locked</Txt></View>
        </View>
      </Card>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a video"
          onPress={() => router.push('/(parent)/add-video')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={styles.actionIcon}><AppIcon name="add-video" size={48} /></View>
          <View style={styles.actionCopy}>
            <Txt weight="black" size={16}>Add a video</Txt>
            <Txt size={12.5} color={colors.parent.muted}>Paste a YouTube link</Txt>
          </View>
          <Txt size={24} color={colors.parent.muted}>›</Txt>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change daily time limit"
          onPress={() => router.push('/(parent)/time-limit')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={styles.actionIcon}><AppIcon name="time" size={48} /></View>
          <View style={styles.actionCopy}>
            <Txt weight="black" size={16}>Daily time</Txt>
            <Txt size={12.5} color={colors.parent.muted}>{limit} minutes per day</Txt>
          </View>
          <Txt size={24} color={colors.parent.muted}>›</Txt>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Txt weight="black" size={17}>Today</Txt>
          {watched.length > 0 ? <Txt weight="bold" size={13} color={colors.parent.muted}>{min} min watched</Txt> : null}
        </View>
        {watched.length === 0 ? (
          <View style={styles.emptyToday}>
            <Txt weight="bold" size={14} color={colors.parent.muted}>Nothing watched yet. You’re all set.</Txt>
          </View>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  hero: { gap: 16, padding: 20, borderWidth: 2 },
  heroReady: { borderColor: '#CDEED4', backgroundColor: '#F8FFF9' },
  heroNeedsVideo: { borderColor: '#FFE0DA', backgroundColor: '#FFF9F7' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 3 },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  check: { backgroundColor: '#FFFFFF', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  actions: { gap: 10 },
  action: { minHeight: 70, borderRadius: 18, padding: 11, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  section: { gap: 10 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyToday: { minHeight: 58, borderRadius: 16, backgroundColor: '#ECE8E1', paddingHorizontal: 16, justifyContent: 'center' },
  video: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 6 },
  thumb: { width: 62, height: 42, borderRadius: 9, backgroundColor: '#ddd' },
});

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { formatDuration } from '@littleloop/shared';
import {
  AppIcon,
  Appear,
  ParentHeader,
  PressableScale,
  ScreenContainer,
  showAppAlert,
  Txt,
  usePane,
} from '@/components';
import { colors, controls, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { useTimerStore } from '@/stores/timerStore';
import { syncFamilyPlaylists } from '@/features/family/playlistSync';
import {
  approvePending,
  listPendingVideos,
  rejectPending,
  removeChannel,
  type PendingVideo,
} from '@/features/channels/channelsApi';

const rowLayout = LinearTransition.springify().damping(20).stiffness(180);

function ago(iso: string | null): string {
  if (!iso) return 'new';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function sameChannel(a: string | undefined, b: string): boolean {
  return (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * 18e — one approved channel: its new uploads waiting for review, the videos
 * from it already live for the child, and the way to stop following it.
 */
export default function ChannelDetail() {
  const pane = usePane<{ id?: string; title?: string }>();
  const { id, title = 'Channel' } = pane.params;
  const profile = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const name = profile?.nickname ?? 'your child';
  const videos = usePlaylistVideos(profile?.id ?? null);
  const sessions = useTimerStore((s) => s.sessions);
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const all = await listPendingVideos(profile.id);
      setPending(all.filter((item) => sameChannel(item.channelTitle, title)));
    } catch {
      // Offline — keep the last list.
    } finally {
      setLoaded(true);
    }
  }, [profile?.id, title]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const live = useMemo(
    () => videos.filter((v) => (v.status ?? 'live') === 'live' && sameChannel(v.video.channelTitle, title)),
    [videos, title],
  );
  const plays = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of sessions) {
      if (session.childProfileId !== profile?.id) continue;
      for (const videoId of session.videoIds) counts.set(videoId, (counts.get(videoId) ?? 0) + 1);
    }
    return counts;
  }, [sessions, profile?.id]);

  const approve = async (item: PendingVideo) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPending((list) => list.filter((p) => p.id !== item.id));
    try {
      await approvePending(item.id);
      if (profile) void syncFamilyPlaylists([profile]).catch(() => {});
    } catch {
      showAppAlert('Couldn’t approve video', 'Check your connection and try again.');
      void refresh();
    }
  };

  const reject = async (item: PendingVideo) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending((list) => list.filter((p) => p.id !== item.id));
    try {
      await rejectPending(item.id);
    } catch {
      void refresh();
    }
  };

  const confirmRemove = () => {
    if (!id) return;
    showAppAlert(
      'Stop following this channel?',
      `New uploads from ${title} will no longer arrive for ${name}. Videos already added stay in the playlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await removeChannel(id);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              pane.back();
            } catch {
              setRemoving(false);
              showAppAlert('Couldn’t remove channel', 'Check your connection and try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scroll style={styles.root}>
      <Appear index={0}>
        <ParentHeader title="Channel" onBack={pane.canGoBack ? pane.back : undefined} />
      </Appear>
      <Appear index={1} style={styles.hero}>
        <View style={styles.art}>
          <AppIcon name="channels" size={40} />
        </View>
        <View style={styles.copy}>
          <Txt weight="black" size={20} numberOfLines={2}>{title}</Txt>
          <Txt weight="bold" size={13} color={colors.parent.muted}>
            Approved for {name} · {live.length} {live.length === 1 ? 'video' : 'videos'} live
          </Txt>
        </View>
      </Appear>

      <Appear index={2} style={styles.note}>
        <Txt weight="bold" size={13} lineHeight={19} color={colors.child.skyDeep}>
          New uploads from this channel always come to you first. {name} only sees the ones you approve.
        </Txt>
      </Appear>

      <Appear index={3} style={styles.section}>
        <Txt weight="black" size={16}>
          {pending.length > 0 ? `${pending.length} new to review` : 'New uploads'}
        </Txt>
        {!loaded ? (
          <ActivityIndicator color={colors.child.skyDeep} style={{ paddingVertical: 12 }} />
        ) : pending.length === 0 ? (
          <View style={styles.empty}>
            <Txt weight="bold" size={13.5} color={colors.parent.muted}>All caught up. New uploads will appear here.</Txt>
          </View>
        ) : (
          <View style={styles.group}>
            {pending.map((item, i) => (
              <Animated.View
                key={item.id}
                layout={rowLayout}
                exiting={FadeOutLeft.duration(220)}
                style={[styles.row, i < pending.length - 1 && styles.divider]}
              >
                <Image source={{ uri: item.video.thumbnailUrl }} style={styles.thumb} transition={150} />
                <View style={styles.copy}>
                  <Txt weight="extrabold" size={14.5} numberOfLines={2}>{item.video.title}</Txt>
                  <Txt weight="bold" size={12} color={colors.parent.muted}>
                    {item.video.durationSeconds ? `${formatDuration(item.video.durationSeconds)} · ` : ''}
                    {ago(item.publishedAt)}
                  </Txt>
                </View>
                <PressableScale accessibilityRole="button" accessibilityLabel={`Decline ${item.video.title}`} onPress={() => void reject(item)} pressedScale={0.88} style={[styles.round, styles.decline]}>
                  <Txt weight="black" size={15} color={colors.parent.muted}>✕</Txt>
                </PressableScale>
                <PressableScale accessibilityRole="button" accessibilityLabel={`Approve ${item.video.title}`} onPress={() => void approve(item)} pressedScale={0.88} style={[styles.round, styles.approve]}>
                  <Txt weight="black" size={16} color="#FFFFFF">✓</Txt>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )}
      </Appear>

      {live.length > 0 ? (
        <Appear index={4} style={styles.section}>
          <Txt weight="black" size={16}>Live for {name}</Txt>
          <View style={styles.group}>
            {live.map((entry, i) => {
              const count = plays.get(entry.video.providerVideoId) ?? 0;
              return (
                <View key={entry.id} style={[styles.row, i < live.length - 1 && styles.divider]}>
                  <Image source={{ uri: entry.video.thumbnailUrl }} style={styles.thumb} transition={150} />
                  <View style={styles.copy}>
                    <Txt weight="extrabold" size={14.5} numberOfLines={1}>{entry.video.title}</Txt>
                    <Txt weight="bold" size={12} color={colors.parent.muted}>
                      {entry.video.durationSeconds ? `${formatDuration(entry.video.durationSeconds)} · ` : ''}
                      {count === 0 ? 'not watched yet' : count === 1 ? 'watched once' : `watched ${count} times`}
                    </Txt>
                  </View>
                </View>
              );
            })}
          </View>
        </Appear>
      ) : null}

      <View style={{ flex: 1, minHeight: 12 }} />
      {id ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title}`}
          onPress={confirmRemove}
          disabled={removing}
          pressedScale={0.97}
          style={styles.remove}
        >
          {removing ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <Txt weight="black" size={15} color={colors.red}>Remove channel</Txt>
          )}
        </PressableScale>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  art: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  note: { backgroundColor: colors.primaryTint, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  section: { gap: 10 },
  group: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F0EBE1' },
  thumb: { width: 72, height: 48, borderRadius: 10, backgroundColor: colors.primaryTint },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  approve: { backgroundColor: colors.green },
  decline: { backgroundColor: colors.parent.paper },
  empty: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, ...shadows.card },
  remove: {
    minHeight: controls.minTouchParent + 10,
    borderRadius: 29,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

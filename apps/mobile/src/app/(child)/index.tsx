import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { formatDuration } from '@littleloop/shared';
import { ChildAvatar, Txt } from '@/components';
import { TimerBadge } from '@/components/TimerBadge';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { remainingSeconds, useSecondsWatchedToday } from '@/stores/timerStore';

const PLAY_COLORS = [colors.primary, colors.coral, colors.green];

/** s13 — child home: oversized tap targets, dimmed padlock, timer pill. */
export default function ChildHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = usePlaylistVideos(profile?.id ?? null);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);

  // Time already used up (e.g. restored after kill) → straight to the break screen.
  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      router.replace('/(child)/times-up');
    }
  }, [remaining, router]);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {profile ? <ChildAvatar avatar={profile.avatar} size={52} /> : null}
            <Txt weight="black" size={28}>
              {profile ? `${profile.nickname}’s Videos` : 'My Videos'}
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/pin-unlock')}
            hitSlop={8}
            style={styles.padlock}
            testID="child-padlock"
          >
            <View style={{ alignItems: 'center' }}>
              <View style={styles.lockShackle} />
              <View style={styles.lockBody} />
            </View>
          </Pressable>
        </View>

        <TimerBadge remainingSeconds={remaining} style={{ marginBottom: 16 }} />

        <View style={{ gap: 16 }}>
          {videos.map((entry, index) => (
            <Pressable
              key={entry.id}
              onPress={() =>
                router.push({ pathname: '/(child)/player', params: { index: String(index) } })
              }
              style={({ pressed }) => [
                styles.videoCard,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <View style={styles.thumbWrap}>
                <Image
                  source={{ uri: entry.video.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                />
                <View style={styles.playCircle}>
                  <Svg width={24} height={28} viewBox="0 0 24 28" style={{ marginLeft: 5 }}>
                    <Path d="M1 1 L23 14 L1 27 Z" fill={PLAY_COLORS[index % PLAY_COLORS.length]} />
                  </Svg>
                </View>
                {entry.video.durationSeconds ? (
                  <View style={styles.durationBadge}>
                    <Txt weight="extrabold" size={12} color="#FFFFFF">
                      {formatDuration(entry.video.durationSeconds)}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <Txt weight="extrabold" size={17} style={styles.videoTitle} numberOfLines={2}>
                {entry.video.title}
              </Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF4E2' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  padlock: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(23,32,51,.06)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  lockShackle: {
    width: 7,
    height: 5,
    borderWidth: 2,
    borderColor: colors.subtle,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: { width: 11, height: 8, borderRadius: 2.5, backgroundColor: colors.subtle },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 10,
    ...shadows.cardLg,
  },
  thumbWrap: {
    height: 170,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#DDEEFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 9,
    right: 10,
    backgroundColor: 'rgba(23,32,51,.75)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  videoTitle: { paddingTop: 11, paddingHorizontal: 8, paddingBottom: 6 },
});

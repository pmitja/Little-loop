import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos } from '@/stores/playlistStore';
import { raiseRequestAndSync } from '@/features/family/requestSync';
import { colors, controls, shadows } from '@/theme/tokens';

interface ChannelChoice {
  channelTitle: string;
  thumbnailUrl: string;
  sampleVideoId: string;
}

/** Child asks for more — either generically or "more from a creator I already watch". */
export default function ChildRequest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const [done, setDone] = useState(false);

  // Distinct creators drawn from what the child already watches — never open YouTube.
  const channels = useMemo<ChannelChoice[]>(() => {
    const seen = new Map<string, ChannelChoice>();
    for (const entry of videos) {
      const title = entry.video.channelTitle?.trim();
      if (!title || seen.has(title)) continue;
      seen.set(title, {
        channelTitle: title,
        thumbnailUrl: entry.video.thumbnailUrl,
        sampleVideoId: entry.video.providerVideoId,
      });
    }
    return [...seen.values()];
  }, [videos]);

  const submit = (kind: 'more' | 'channel', opts?: ChannelChoice) => {
    if (!profile || done) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    raiseRequestAndSync(profile.id, kind, opts);
    setDone(true);
    setTimeout(() => router.back(), 1100);
  };

  if (done) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Txt weight="black" size={26} color={colors.parent.night} center>
          Okay! 💛
        </Txt>
        <Txt weight="bold" size={16} color={colors.parent.muted} center style={{ marginTop: 8 }}>
          We told your grown-up.
        </Txt>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Txt weight="black" size={22} color={colors.child.skyDeep}>
              ‹
            </Txt>
          </Pressable>
          <Txt weight="black" size={26} color={colors.parent.night}>
            Want more?
          </Txt>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask for more videos"
          onPress={() => submit('more')}
          style={({ pressed }) => [styles.moreCard, pressed && styles.cardPressed]}
        >
          <Txt weight="black" size={34}>
            💛
          </Txt>
          <Txt weight="black" size={18} color="#FFFFFF" center>
            Just more videos, please
          </Txt>
        </Pressable>

        {channels.length > 0 ? (
          <>
            <Txt weight="black" size={16} color={colors.parent.night} style={styles.sectionLabel}>
              Or more from…
            </Txt>
            <View style={styles.grid}>
              {channels.map((channel) => (
                <Pressable
                  key={channel.channelTitle}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask for more from ${channel.channelTitle}`}
                  onPress={() => submit('channel', channel)}
                  style={({ pressed }) => [styles.channelTile, pressed && styles.cardPressed]}
                >
                  <Image
                    source={channel.thumbnailUrl}
                    style={styles.channelThumb}
                    contentFit="cover"
                    transition={150}
                  />
                  <Txt
                    weight="black"
                    size={13}
                    color={colors.parent.night}
                    numberOfLines={2}
                    center
                    style={styles.channelName}
                  >
                    {channel.channelTitle}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 40, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: controls.minTouchParent,
    height: controls.minTouchParent,
    borderRadius: controls.minTouchParent / 2,
    backgroundColor: 'rgba(255,255,255,.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  moreCard: {
    minHeight: 132,
    borderRadius: 24,
    backgroundColor: colors.child.coral,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    ...shadows.cardLg,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  sectionLabel: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  channelTile: {
    width: '47%',
    flexGrow: 1,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  channelThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#DDEEFE',
  },
  channelName: { minHeight: 34 },
});

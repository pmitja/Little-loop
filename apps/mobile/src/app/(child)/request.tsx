import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, ChildAvatar, Float, LikeToast, PopIn, PressableScale, Txt } from '@/components';
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

  const [picked, setPicked] = useState<string | null>(null);

  const submit = (kind: 'more' | 'channel', opts?: ChannelChoice) => {
    if (!profile || done) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    raiseRequestAndSync(profile.id, kind, opts);
    setPicked(opts?.channelTitle ?? 'more');
    setDone(true);
    setTimeout(() => router.back(), 1400);
  };

  const rows: { key: string; label: string; channel?: ChannelChoice }[] = [
    { key: 'more', label: 'New videos' },
    ...channels.map((channel) => ({ key: channel.channelTitle, label: `More ${channel.channelTitle}`, channel })),
  ];

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={['#C4F3E1', colors.child.cream]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Appear index={0}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            pressedScale={0.9}
            style={styles.back}
          >
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M15 4 7 12l8 8" stroke={colors.child.skyDeep} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </PressableScale>
        </Appear>
        <Appear index={1} style={{ gap: 4 }}>
          <Txt weight="black" size={34} color={colors.parent.night}>Want more?</Txt>
          <Txt weight="extrabold" size={17} color="rgba(42,59,92,.75)">Tap a heart. We’ll tell your grown-up.</Txt>
        </Appear>
        <View style={styles.list}>
          {rows.map((row, i) => {
            const chosen = picked === row.key;
            return (
              <Appear key={row.key} index={i + 2}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={row.channel ? `Ask for more from ${row.channel.channelTitle}` : 'Ask for more videos'}
                  onPress={() => submit(row.channel ? 'channel' : 'more', row.channel)}
                  haptic="medium"
                  style={styles.row}
                >
                  <View style={styles.art}>
                    {row.channel ? (
                      <Image source={row.channel.thumbnailUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                    ) : (
                      <Float distance={3} sway={4}><ChildAvatar avatar={profile?.avatar ?? 'fox'} size={72} /></Float>
                    )}
                  </View>
                  <Txt weight="black" size={20} color={colors.parent.night} numberOfLines={2} style={{ flex: 1 }}>
                    {row.label}
                  </Txt>
                  <View style={[styles.heart, (i === 0 || chosen) && styles.heartHot]}>
                    {chosen ? (
                      <PopIn><Txt weight="black" size={34} color="#FFFFFF">♥</Txt></PopIn>
                    ) : (
                      <Txt weight="black" size={34} color={i === 0 ? '#FFFFFF' : colors.child.coral}>♥</Txt>
                    )}
                  </View>
                </PressableScale>
              </Appear>
            );
          })}
        </View>
      </ScrollView>
      {done ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 48 }]}>
          <LikeToast text="Told your grown-up ♥" avatar={profile?.avatar} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, gap: 18 },
  back: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5,
  },
  list: { gap: 14, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    ...shadows.cardLg,
  },
  art: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#FFF1EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    width: controls.minTouchChild + 20,
    height: controls.minTouchChild + 20,
    borderRadius: (controls.minTouchChild + 20) / 2,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartHot: { backgroundColor: colors.child.coral, ...shadows.coralButton },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

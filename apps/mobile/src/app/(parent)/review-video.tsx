import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import {
  formatDuration,
  formatDurationLong,
  videoMetaSchema,
  type VideoMeta,
} from '@littleloop/shared';
import { Button, Card, ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';

function CheckMark({ on }: { on: boolean }) {
  return (
    <View style={[styles.checkBox, { backgroundColor: on ? colors.green : '#D6DEE9' }]}>
      <Svg width={11} height={9} viewBox="0 0 11 9">
        <Path
          d="M1.5 4.5 L4 7 L9.5 1.5"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** s09 — preview the resolved video and explicitly approve it. */
export default function ReviewVideo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ video?: string }>();
  const [approved, setApproved] = useState(false);

  const video: VideoMeta | null = useMemo(() => {
    try {
      return videoMetaSchema.parse(JSON.parse(params.video ?? ''));
    } catch {
      return null;
    }
  }, [params.video]);

  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const addVideo = usePlaylistStore((s) => s.addVideo);

  if (!video || !profile) {
    // Shouldn't happen in the normal flow; bail out gracefully.
    router.back();
    return null;
  }

  const onAdd = () => {
    const result = addVideo(profile.id, video);
    if (result === 'duplicate') {
      Alert.alert('Already added', `This video is already in ${profile.nickname}’s playlist.`);
      return;
    }
    if (result === 'limit') {
      // 11th video on the free plan → paywall (PLAN §12); the approved video
      // stays on this screen so the add can be retried after purchase.
      router.push('/paywall');
      return;
    }
    router.replace('/(parent)/(tabs)/playlist');
  };

  return (
    <ScreenContainer style={styles.container}>
      <ParentHeader title="Review video" onBack={() => router.back()} />

      <Card radius={radii.cardLg} padding={14} large style={styles.previewCard}>
        <View style={styles.thumbWrap}>
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
          {video.durationSeconds ? (
            <View style={styles.durationBadge}>
              <Txt weight="extrabold" size={11.5} color="#FFFFFF">
                {formatDuration(video.durationSeconds)}
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Txt weight="extrabold" size={17} lineHeight={23}>
            {video.title}
          </Txt>
          <Txt weight="semibold" size={13.5} color={colors.muted} style={{ marginTop: 6 }}>
            {video.channelTitle}
            {video.durationSeconds ? ` · ${formatDurationLong(video.durationSeconds)}` : ''}
          </Txt>
        </View>
      </Card>

      <Pressable
        onPress={() => setApproved((a) => !a)}
        style={[styles.approveRow, approved ? styles.approveRowOn : null]}
      >
        <CheckMark on={approved} />
        <Txt
          weight="extrabold"
          size={14.5}
          lineHeight={20}
          color={approved ? '#1E7A4E' : colors.muted}
        >
          I approve this video for my child.
        </Txt>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Button title="Add to Playlist" disabled={!approved} onPress={onAdd} />
      <Button title="Cancel" variant="ghost" size="md" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16, paddingBottom: 12 },
  previewCard: { marginTop: 20 },
  thumbWrap: { height: 186, borderRadius: 16, overflow: 'hidden', backgroundColor: '#DDEEFE' },
  thumb: { flex: 1 },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(23,32,51,.75)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  meta: { paddingHorizontal: 6, paddingTop: 14, paddingBottom: 6 },
  approveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
  },
  approveRowOn: { backgroundColor: colors.greenTint, borderColor: colors.green },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import {
  formatDuration,
  formatDurationLong,
  videoMetaSchema,
  type VideoMeta,
} from '@littleloop/shared';
import { Button, Card, ParentHeader, ScreenContainer, showAppAlert, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePremium } from '@/stores/entitlementStore';
import { commitApprovedVideo } from '@/features/family/playlistSync';
import {
  approveChannel,
  channelApprovalErrorMessage,
} from '@/features/channels/channelsApi';
import { useChannelSuggestionStore } from '@/features/channels/channelSuggestionStore';

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
  const params = useLocalSearchParams<{ video?: string; entryId?: string }>();
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvingChannel, setApprovingChannel] = useState(false);
  const premium = usePremium();

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
  if (!video || !profile) {
    // Shouldn't happen in the normal flow; bail out gracefully.
    router.back();
    return null;
  }

  const onAdd = async () => {
    setSaving(true);
    let result;
    try {
      result = await commitApprovedVideo(profile.id, video, params.entryId);
    } catch {
      setSaving(false);
      showAppAlert('Couldn’t add video', 'Check your connection and try again.');
      return;
    }
    setSaving(false);
    if (result === 'duplicate') {
      showAppAlert('Already added', `This video is already in ${profile.nickname}’s playlist.`);
      return;
    }
    if (result === 'limit') {
      // First video above the free-plan cap → paywall (PLAN §12); the approved video
      // stays on this screen so the add can be retried after purchase.
      router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: profile.nickname } });
      return;
    }
    router.replace('/(parent)/(tabs)/playlist');
  };

  const onApproveChannel = async () => {
    if (!premium) {
      router.push({ pathname: '/paywall', params: { trigger: 'channels', child: profile.nickname } });
      return;
    }
    setApprovingChannel(true);
    try {
      const res = await approveChannel(profile.id, video.providerVideoId);
      useChannelSuggestionStore.getState().set(profile.id, res.channel.channelTitle, res.suggestions);
      router.replace('/(parent)/channel-approved');
    } catch (error) {
      setApprovingChannel(false);
      showAppAlert('Couldn’t approve channel', channelApprovalErrorMessage(error));
    }
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Approve ${video.channelTitle}'s whole channel`}
        onPress={() => void onApproveChannel()}
        disabled={approvingChannel}
        style={({ pressed }) => [styles.channelRow, pressed && { opacity: 0.7 }]}
      >
        <Txt weight="extrabold" size={13.5} color={colors.child.skyDeep}>
          ＋ Approve {video.channelTitle}’s whole channel
        </Txt>
        <Txt weight="semibold" size={11.5} color={colors.muted} style={{ marginTop: 2 }}>
          Add its popular videos now; new uploads arrive for review.
        </Txt>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Button title="Add to Playlist" disabled={!approved} loading={saving} onPress={() => void onAdd()} />
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
  channelRow: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.input,
    backgroundColor: colors.primaryTint,
  },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

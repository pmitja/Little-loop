import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useShareIntentContext } from 'expo-share-intent';
import {
  extractYouTubeIdFromText,
  formatDuration,
  youtubeWatchUrl,
  type VideoMeta,
} from '@littleloop/shared';
import { AppDialogHost, Button, ChildAvatar, ParentHeader, ScreenContainer, SectionLabel, Txt } from '@/components';
import { colors, radii, shadows } from '@/theme/tokens';
import { previewVideo, VideoPreviewError, VIDEO_ERROR_MESSAGES } from '@/lib/videos';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { commitApprovedVideo } from '@/features/family/playlistSync';

type Phase =
  | { kind: 'resolving' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; video: VideoMeta }
  | { kind: 'added'; video: VideoMeta; childName: string; approved: boolean };

/**
 * Share target: a YouTube link handed over from another app's share sheet.
 *
 * Entry from the system share sheet is routed through the parent PIN before
 * this screen becomes visible. Review remains the default, but the authenticated
 * parent can explicitly approve the video while adding it.
 */
export default function ShareVideo() {
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const profiles = useAppStore((s) => s.childProfiles);
  const activeId = useAppStore((s) => s.activeChildProfileId);

  const [phase, setPhase] = useState<Phase>({ kind: 'resolving' });
  const [selectedId, setSelectedId] = useState<string | null>(
    activeId ?? profiles[0]?.id ?? null,
  );
  const [approveImmediately, setApproveImmediately] = useState(false);
  const [adding, setAdding] = useState(false);
  const leaving = useRef(false);

  // A share launch may be the root of the navigation stack, so GO_BACK is not
  // reliable. Finish inside LittleLoop on the playlist that received the video.
  const close = useCallback(() => {
    leaving.current = true;
    router.replace('/(parent)/(tabs)/playlist');
    resetShareIntent();
  }, [resetShareIntent, router]);

  const shared = shareIntent.webUrl ?? shareIntent.text ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!shared) {
      // resetShareIntent runs as we leave. Do not turn the completed screen into
      // a misleading "share didn't include a link" error during navigation.
      if (leaving.current) return;
      setPhase({ kind: 'error', message: 'That share didn’t include a link.' });
      return;
    }
    const videoId = extractYouTubeIdFromText(shared);
    if (!videoId) {
      setPhase({ kind: 'error', message: VIDEO_ERROR_MESSAGES.INVALID_LINK });
      return;
    }
    setPhase({ kind: 'resolving' });
    previewVideo(youtubeWatchUrl(videoId))
      .then((video) => {
        if (!cancelled) setPhase({ kind: 'ready', video });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase({
          kind: 'error',
          message:
            err instanceof VideoPreviewError ? err.message : VIDEO_ERROR_MESSAGES.VIDEO_UNAVAILABLE,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [shared]);

  const add = async () => {
    if (phase.kind !== 'ready' || !selectedId) return;
    const child = profiles.find((p) => p.id === selectedId);
    if (!child) return;
    setAdding(true);
    let result;
    try {
      result = approveImmediately
        ? await commitApprovedVideo(child.id, phase.video)
        : usePlaylistStore.getState().addVideo(child.id, phase.video, 'review');
    } catch {
      setAdding(false);
      setPhase({
        kind: 'error',
        message: 'Couldn’t add this video. Check your connection and try again.',
      });
      return;
    }
    setAdding(false);

    if (result === 'limit') {
      leaving.current = true;
      router.replace({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: child.nickname } });
      resetShareIntent();
      return;
    }
    if (result === 'duplicate') {
      setPhase({ kind: 'error', message: `${child.nickname} already has this video.` });
      return;
    }
    setPhase({
      kind: 'added',
      video: phase.video,
      childName: child.nickname,
      approved: approveImmediately,
    });
  };

  // Shared into an account that has no child yet — onboarding, not a playlist.
  if (profiles.length === 0) {
    return (
      <ScreenContainer style={styles.root}>
        <ParentHeader title="Add to LittleLoop" onBack={close} />
        <View style={styles.centered}>
          <Txt size={40}>🦉</Txt>
          <Txt weight="black" size={19} style={{ marginTop: 12, textAlign: 'center' }}>
            Add a child first
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} style={styles.centeredCopy}>
            Videos go into a child’s playlist, so LittleLoop needs a profile before it can keep this one.
          </Txt>
          <Button title="Finish setting up" onPress={close} style={{ alignSelf: 'stretch', marginTop: 20 }} />
        </View>
      </ScreenContainer>
    );
  }

  if (phase.kind === 'added') {
    return (
      <ScreenContainer style={styles.root}>
        <ParentHeader title="Added" onBack={close} />
        <View style={styles.centered}>
          <Txt size={40}>✅</Txt>
          <Txt weight="black" size={19} style={{ marginTop: 12, textAlign: 'center' }}>
            Saved for {phase.childName}
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} style={styles.centeredCopy}>
            {phase.approved
              ? `“${phase.video.title}” is approved and available in ${phase.childName}’s playlist.`
              : `“${phase.video.title}” is waiting in review. It won’t show up for ${phase.childName} until you approve it in the playlist.`}
          </Txt>
          <Button
            title="View playlist"
            onPress={close}
            style={{ alignSelf: 'stretch', marginTop: 20 }}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer style={styles.root}>
        <ParentHeader title="Add to LittleLoop" onBack={close} />

        {phase.kind === 'resolving' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Txt weight="semibold" size={14} color={colors.muted} style={{ marginTop: 12 }}>
              Checking the video…
            </Txt>
          </View>
        ) : null}

        {phase.kind === 'error' ? (
          <View style={styles.centered}>
            <Txt size={40}>😕</Txt>
            <Txt weight="black" size={19} style={{ marginTop: 12, textAlign: 'center' }}>
              Can’t add this one
            </Txt>
            <Txt weight="semibold" size={14} color={colors.muted} style={styles.centeredCopy}>
              {phase.message}
            </Txt>
            <Button
              title="Back to playlist"
              onPress={close}
              style={{ alignSelf: 'stretch', marginTop: 20 }}
            />
          </View>
        ) : null}

        {phase.kind === 'ready' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.preview}>
              <View style={styles.thumb}>
                <Image
                  source={{ uri: phase.video.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                {phase.video.durationSeconds ? (
                  <View style={styles.durationBadge}>
                    <Txt weight="extrabold" size={10} color="#FFFFFF">
                      {formatDuration(phase.video.durationSeconds)}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <Txt weight="extrabold" size={15} lineHeight={20} numberOfLines={3} style={{ marginTop: 12 }}>
                {phase.video.title}
              </Txt>
              <Txt weight="semibold" size={12.5} color={colors.muted} numberOfLines={1} style={{ marginTop: 3 }}>
                {phase.video.channelTitle}
              </Txt>
            </View>

            <SectionLabel style={{ marginTop: 22 }}>Who is this for?</SectionLabel>
            <View style={styles.childList}>
              {profiles.map((child) => {
                const selected = child.id === selectedId;
                return (
                  <Pressable
                    key={child.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Add to ${child.nickname}’s playlist`}
                    onPress={() => setSelectedId(child.id)}
                    style={[styles.childRow, selected && styles.childRowSelected]}
                  >
                    <ChildAvatar avatar={child.avatar} size={34} />
                    <Txt weight="extrabold" size={15.5} style={{ flex: 1 }}>
                      {child.nickname}
                    </Txt>
                    {selected ? (
                      <Txt weight="black" color={colors.child.skyDeep}>
                        ✓
                      </Txt>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: approveImmediately }}
              accessibilityLabel="Approve video immediately"
              accessibilityHint="Makes the video available in Child Mode as soon as it is added"
              onPress={() => setApproveImmediately((approved) => !approved)}
              style={[styles.approvalRow, approveImmediately && styles.approvalRowSelected]}
            >
              <View style={[styles.approvalCheck, approveImmediately && styles.approvalCheckSelected]}>
                {approveImmediately ? (
                  <Txt weight="black" size={14} color="#FFFFFF">
                    ✓
                  </Txt>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="extrabold" size={14.5}>
                  Approve immediately
                </Txt>
                <Txt weight="semibold" size={12.5} color={colors.muted} lineHeight={18}>
                  {approveImmediately
                    ? 'This video will be available in Child Mode right away.'
                    : 'Leave off to keep the video waiting for review.'}
                </Txt>
              </View>
            </Pressable>

            <Button
              title={approveImmediately ? 'Approve & add to playlist' : 'Add to playlist'}
              loading={adding}
              disabled={!selectedId}
              onPress={() => void add()}
              style={{ marginTop: 18 }}
            />
          </ScrollView>
        ) : null}
      </ScreenContainer>
      {/* This screen is presented as a modal, so dialogs must draw inside it;
          a root-level <Modal> would be presented behind it and swallow taps. */}
      <AppDialogHost nested />
    </>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  centeredCopy: { marginTop: 8, textAlign: 'center', lineHeight: 20 },
  preview: { marginTop: 18 },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.primaryTint,
  },
  durationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  childList: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginTop: 4,
    ...shadows.card,
  },
  childRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.parent.hairline,
  },
  childRowSelected: {
    backgroundColor: colors.primaryTint,
    borderLeftWidth: 3,
    borderLeftColor: colors.child.skyDeep,
  },
  approvalRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.input,
  },
  approvalRowSelected: {
    backgroundColor: colors.greenTint,
    borderColor: colors.green,
  },
  approvalCheck: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  approvalCheckSelected: { backgroundColor: colors.green },
});

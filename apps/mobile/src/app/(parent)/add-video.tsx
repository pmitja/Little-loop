import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { extractYouTubeId, type VideoMeta } from '@littleloop/shared';
import { Button, ParentHeader, ScreenContainer, SectionLabel, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import { previewVideo, VideoPreviewError, VIDEO_ERROR_MESSAGES } from '@/lib/videos';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';

function PlayBadge() {
  return (
    <View style={styles.playBadge}>
      <Svg width={9} height={11} viewBox="0 0 9 11">
        <Path d="M1 1 L8 5.5 L1 10 Z" fill={colors.primary} />
      </Svg>
    </View>
  );
}

/** s08 — paste a video link, validate, preview. */
export default function AddVideo() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const profile = useAppStore((s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null);
  const addVideo = usePlaylistStore((s) => s.addVideo);

  const isLink = extractYouTubeId(input) !== null;

  /** Local add + hand over to the review screen. */
  const addAndReview = (video: VideoMeta): void => {
    if (!profile) return;
    const result = addVideo(profile.id, video, 'review');
    if (result === 'limit') { router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: profile.nickname } }); return; }
    if (result === 'duplicate') { setError('This video is already in the playlist.'); return; }
    const created = usePlaylistStore.getState().videosByChild[profile.id]?.find((v) => v.video.providerVideoId === video.providerVideoId);
    router.push({
      pathname: '/(parent)/review-video',
      params: { video: JSON.stringify(video), entryId: created?.id },
    });
  };

  const onPreviewLink = async () => {
    setError(null);
    setLoading(true);
    try {
      const video = await previewVideo(input);
      addAndReview(video);
    } catch (err) {
      setError(
        err instanceof VideoPreviewError ? err.message : VIDEO_ERROR_MESSAGES.VIDEO_UNAVAILABLE,
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    if (isLink) {
      void onPreviewLink();
    } else {
      setError(VIDEO_ERROR_MESSAGES.INVALID_LINK);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ParentHeader title="Add Video" onBack={() => router.back()} />
        <SectionLabel style={styles.label}>Paste video link</SectionLabel>
        <View style={[styles.inputWrap, error ? styles.inputError : null]}>
          <PlayBadge />
          <TextInput
            value={input}
            onChangeText={(next) => {
              setInput(next);
              if (error) setError(null);
            }}
            placeholder="https://…"
            placeholderTextColor={colors.subtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus
            style={styles.input}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />
          {input.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear input"
              onPress={() => {
                setInput('');
                setError(null);
              }}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Svg width={10} height={10} viewBox="0 0 10 10">
                <Path
                  d="M1 1 L9 9 M9 1 L1 9"
                  stroke={colors.muted}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <Txt weight="bold" size={13} color={colors.red} style={styles.helper}>
            {error}
          </Txt>
        ) : (
          <Txt weight="semibold" size={13} color={colors.muted} lineHeight={19.5} style={styles.helper}>
            Add one video at a time to keep the playlist fully parent-approved.
          </Txt>
        )}
        <Button
          title="Preview Video"
          loading={loading}
          disabled={input.trim().length === 0}
          onPress={onSubmit}
          style={styles.cta}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  label: { marginTop: 20, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  inputError: { borderColor: colors.red, shadowColor: colors.red },
  playBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 12,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: { marginTop: 10, marginHorizontal: 4 },
  cta: { marginTop: 22 },
});

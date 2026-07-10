import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'expo-image';
import { extractYouTubeId, formatDuration, type VideoMeta } from '@littleloop/shared';
import { Button, ParentHeader, ScreenContainer, SectionLabel, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import {
  previewVideo,
  searchAvailable,
  searchVideos,
  VideoPreviewError,
  VIDEO_ERROR_MESSAGES,
} from '@/lib/videos';
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

/** s08 — search YouTube or paste a video link, validate, preview. */
export default function AddVideo() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoMeta[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const profile = useAppStore((s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null);
  const addVideo = usePlaylistStore((s) => s.addVideo);

  const canSearch = searchAvailable();
  const isLink = extractYouTubeId(input) !== null;

  /** Shared tail of both flows: local add + hand over to the review screen. */
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
      setResults(null);
      addAndReview(video);
    } catch (err) {
      setError(
        err instanceof VideoPreviewError ? err.message : VIDEO_ERROR_MESSAGES.VIDEO_UNAVAILABLE,
      );
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => {
    if (input.trim().length < 2) {
      setError('Type at least 2 characters to search');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const found = await searchVideos(input);
      setResults(found);
      if (found.length === 0) setError('No videos found — try different words or paste a link.');
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
    } else if (canSearch) {
      void onSearch();
    } else {
      setError(VIDEO_ERROR_MESSAGES.INVALID_LINK);
    }
  };

  const onPickResult = (video: VideoMeta) => {
    if (addingId) return;
    setError(null);
    setAddingId(video.providerVideoId);
    try {
      addAndReview(video);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ParentHeader title="Add Video" onBack={() => router.back()} />
        <SectionLabel style={styles.label}>
          {canSearch ? 'Search YouTube or paste a link' : 'Paste video link'}
        </SectionLabel>
        <View style={[styles.inputWrap, error ? styles.inputError : null]}>
          <PlayBadge />
          <TextInput
            value={input}
            onChangeText={(next) => {
              setInput(next);
              if (error) setError(null);
            }}
            placeholder={canSearch ? 'e.g. peppa pig, or https://…' : 'https://…'}
            placeholderTextColor={colors.subtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={canSearch ? 'default' : 'url'}
            autoFocus
            style={styles.input}
            onSubmitEditing={onSubmit}
            returnKeyType={canSearch ? 'search' : 'go'}
          />
          {input.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear input"
              onPress={() => {
                setInput('');
                setResults(null);
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
            {results
              ? 'Every result opens in review first — nothing reaches the playlist unapproved.'
              : 'Add one video at a time to keep the playlist fully parent-approved.'}
          </Txt>
        )}
        <Button
          title={isLink ? 'Preview Video' : canSearch ? 'Search' : 'Preview Video'}
          loading={loading}
          disabled={input.trim().length === 0}
          onPress={onSubmit}
          style={styles.cta}
        />
        {results && results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.providerVideoId}
            keyboardShouldPersistTaps="handled"
            style={styles.resultsList}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.title}`}
                onPress={() => onPickResult(item)}
                style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.resultThumb}>
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  {item.durationSeconds ? (
                    <View style={styles.durationBadge}>
                      <Txt weight="extrabold" size={10} color="#FFFFFF">
                        {formatDuration(item.durationSeconds)}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt weight="extrabold" size={13.5} color={colors.ink} numberOfLines={2} lineHeight={18}>
                    {item.title}
                  </Txt>
                  <Txt weight="semibold" size={12} color={colors.muted} style={{ marginTop: 3 }} numberOfLines={1}>
                    {item.channelTitle}
                  </Txt>
                </View>
              </Pressable>
            )}
          />
        ) : null}
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
  resultsList: { marginTop: 20, flex: 1 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  resultThumb: {
    width: 122,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primaryTint,
  },
  durationBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
});

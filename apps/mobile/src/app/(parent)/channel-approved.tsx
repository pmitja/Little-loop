import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { formatDuration, type VideoMeta } from '@littleloop/shared';
import { ParentHeader, ScreenContainer, showAppAlert, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { commitApprovedVideo } from '@/features/family/playlistSync';
import { useChannelSuggestionStore } from '@/features/channels/channelSuggestionStore';

/** Backfill pick-list shown right after a channel is approved (PLAN §12). */
export default function ChannelApproved() {
  const router = useRouter();
  const { childProfileId, channelTitle, suggestions } = useChannelSuggestionStore();
  const clear = useChannelSuggestionStore((s) => s.clear);
  const name = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === childProfileId)?.nickname ?? 'your child',
  );
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const onAdd = async (video: VideoMeta) => {
    if (!childProfileId || busy) return;
    setBusy(video.providerVideoId);
    try {
      const result = await commitApprovedVideo(childProfileId, video);
      if (result === 'added' || result === 'duplicate') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAdded((prev) => ({ ...prev, [video.providerVideoId]: true }));
      } else {
        showAppAlert('Couldn’t add video', 'Please try again.');
      }
    } catch {
      showAppAlert('Couldn’t add video', 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const done = () => {
    clear();
    router.back();
  };

  return (
    <ScreenContainer style={styles.container}>
      <ParentHeader title="Channel approved" onBack={done} />
      <Txt weight="semibold" size={13.5} color={colors.parent.muted} lineHeight={19} style={styles.intro}>
        {channelTitle ? `${channelTitle}’s ` : ''}popular videos — add any to {name}’s playlist now.
        New uploads will arrive for your review automatically.
      </Txt>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.providerVideoId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Txt weight="semibold" size={13.5} color={colors.parent.muted} style={styles.empty}>
            No videos to suggest right now — new uploads will still arrive for review.
          </Txt>
        }
        renderItem={({ item }) => {
          const isAdded = added[item.providerVideoId];
          return (
            <View style={styles.row}>
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              <View style={styles.copy}>
                <Txt weight="bold" size={13.5} numberOfLines={2}>
                  {item.title}
                </Txt>
                <Txt size={12} color={colors.parent.muted} numberOfLines={1}>
                  {item.durationSeconds ? formatDuration(item.durationSeconds) : 'Video'}
                </Txt>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isAdded ? `${item.title} added` : `Add ${item.title}`}
                disabled={isAdded || busy === item.providerVideoId}
                onPress={() => void onAdd(item)}
                style={({ pressed }) => [
                  styles.addBtn,
                  isAdded && styles.addBtnDone,
                  pressed && !isAdded && { opacity: 0.7 },
                ]}
              >
                <Txt weight="extrabold" size={13} color={isAdded ? colors.child.grass : '#FFFFFF'}>
                  {isAdded ? '✓ Added' : 'Add'}
                </Txt>
              </Pressable>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  intro: { marginTop: 12, marginHorizontal: 4 },
  list: { paddingTop: 16, paddingBottom: 32, gap: 10 },
  empty: { marginTop: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: colors.parent.card,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    borderRadius: 14,
  },
  thumb: { width: 78, height: 50, borderRadius: 9, backgroundColor: '#EAF6FA' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  addBtn: {
    minWidth: 66,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: colors.child.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: colors.child.grass + '22' },
});

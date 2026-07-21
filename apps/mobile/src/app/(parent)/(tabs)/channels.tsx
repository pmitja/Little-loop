import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, ParentHeader, showAppAlert, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { listChannels, removeChannel, type ApprovedChannel } from '@/features/channels/channelsApi';

/** Manage the channels a parent has approved for the active child (PLAN §12). */
export default function ChannelsTab() {
  const insets = useSafeAreaInsets();
  const profile = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const name = profile?.nickname ?? 'your child';
  const [channels, setChannels] = useState<ApprovedChannel[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setChannels(await listChannels(profile.id));
    } catch {
      // Offline or local-only — keep what we have.
    } finally {
      setLoaded(true);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const confirmRemove = (channel: ApprovedChannel) => {
    showAppAlert(
      'Stop following this channel?',
      `New uploads from ${channel.channelTitle} will no longer arrive for ${name}. Videos already added stay in the playlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setChannels((list) => list.filter((c) => c.id !== channel.id));
            void removeChannel(channel.id).catch(() => {
              showAppAlert('Couldn’t remove channel', 'Check your connection and try again.');
              void refresh();
            });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <ParentHeader
          title="Channels"
          subtitle={channels.length > 0 ? `${channels.length} approved` : undefined}
        />
      </View>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Txt weight="semibold" size={13.5} color={colors.parent.muted} lineHeight={19} style={styles.intro}>
            New uploads from these channels arrive for your review automatically. Videos never reach {name} until you approve them.
          </Txt>
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.emptyCard}>
              <AppIcon name="channels" size={64} />
              <Txt weight="black" size={16} center>
                No channels yet
              </Txt>
              <Txt weight="semibold" size={13.5} color={colors.parent.muted} center lineHeight={19}>
                When {name} taps the ♥ on a video, you’ll see a request to approve that creator’s channel here.
              </Txt>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.copy}>
              <Txt weight="bold" size={14.5} numberOfLines={1}>
                {item.channelTitle}
              </Txt>
              {item.lastPulledAt ? (
                <Txt size={12} color={colors.parent.muted}>
                  Last checked{' '}
                  {new Date(item.lastPulledAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Txt>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.channelTitle}`}
              onPress={() => confirmRemove(item)}
              hitSlop={6}
              style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
            >
              <Txt weight="extrabold" size={13} color={colors.coral}>
                Remove
              </Txt>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20 },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 10 },
  intro: { marginTop: 8, marginBottom: 8, marginHorizontal: 4 },
  emptyCard: {
    marginTop: 24,
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.parent.card,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.parent.card,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    borderRadius: 14,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.coralTint,
  },
});

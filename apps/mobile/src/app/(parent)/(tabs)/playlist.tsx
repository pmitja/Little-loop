import { ScreenContainer } from '@/components/ScreenContainer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { FREE_LIMITS, formatDuration, type PlaylistVideo } from '@littleloop/shared';
import {
  AddVideoIllustration,
  AppIcon,
  Appear,
  ChildAvatar,
  EmptyState,
  ParentHeader,
  PressableScale,
  Segmented,
  showAppAlert,
  Txt,
} from '@/components';
import { colors, controls, shadows } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { PaneHost, PanePlaceholder, SplitView } from '@/features/tablet/PaneHost';
import { ReviewPane } from '@/features/tablet/ReviewPane';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { usePendingRequests } from '@/stores/requestStore';
import { usePremium } from '@/stores/entitlementStore';
import {
  commitApprovedVideo,
  removeSharedVideo,
  reorderSharedVideos,
  syncFamilyPlaylists,
} from '@/features/family/playlistSync';
import { resolveSharedRequest, syncFamilyRequests } from '@/features/family/requestSync';
import {
  approveChannel,
  channelApprovalErrorMessage,
  approvePending,
  listChannels,
  listPendingVideos,
  rejectPending,
  type ApprovedChannel,
  type PendingVideo,
} from '@/features/channels/channelsApi';
import { useChannelSuggestionStore } from '@/features/channels/channelSuggestionStore';
import type { WatchRequest } from '@/stores/requestStore';

type Segment = 'videos' | 'channels';
const waitingLayout = LinearTransition.springify().damping(20).stiffness(180);

/** Three stacked bars — the standard "grab me" affordance (Spotify, SiriusXM). */
function DragHandle() {
  return (
    <View style={styles.handle}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.handleBar} />
      ))}
    </View>
  );
}

export default function Playlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore(
    (s) =>
      s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = usePlaylistVideos(profile?.id ?? null);
  const requests = usePendingRequests(profile?.id ?? null);
  const premium = usePremium();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [channels, setChannels] = useState<ApprovedChannel[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { split, listWidth } = useResponsiveLayout();
  // iPad: which waiting video / channel is open beside the list.
  const [pickedWaiting, setPickedWaiting] = useState<string | null>(null);
  const [pickedChannel, setPickedChannel] = useState<string | null>(null);
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(params.segment === 'channels' ? 'channels' : 'videos');
  useEffect(() => {
    if (params.segment === 'channels' || params.segment === 'videos') setSegment(params.segment);
  }, [params.segment]);

  const refreshPending = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setPending(await listPendingVideos(profile.id));
    } catch {
      // Local-only or offline — leave the last known queue.
    }
  }, [profile?.id]);

  const refreshChannels = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setChannels(await listChannels(profile.id));
    } catch {
      // Offline or local-only — keep what we have.
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      const latest = useAppStore.getState().childProfiles.find((item) => item.id === profile?.id);
      if (latest) {
        void syncFamilyPlaylists([latest]).catch(() => {});
        void syncFamilyRequests([latest]).catch(() => {});
      }
      void refreshPending();
      void refreshChannels();
    }, [profile?.id, refreshPending, refreshChannels]),
  );

  // A creator the parent already follows shouldn't surface an "approve channel"
  // ask — new uploads already flow through the review queue. Hide those requests
  // and resolve them everywhere so they clear on every family device.
  const approvedTitles = useMemo(
    () => new Set(channels.map((c) => c.channelTitle.trim().toLowerCase())),
    [channels],
  );
  const isAlreadyApproved = useCallback(
    (req: WatchRequest) =>
      req.kind === 'channel' &&
      !!req.channelTitle &&
      approvedTitles.has(req.channelTitle.trim().toLowerCase()),
    [approvedTitles],
  );
  const visibleRequests = useMemo(
    () => requests.filter((req) => !isAlreadyApproved(req)),
    [requests, isAlreadyApproved],
  );

  useEffect(() => {
    if (!profile?.id) return;
    for (const req of requests) {
      if (isAlreadyApproved(req)) resolveSharedRequest(profile.id, req.id);
    }
  }, [profile?.id, requests, isAlreadyApproved]);

  const onApproveChannel = async (req: WatchRequest) => {
    if (!profile || approvingId) return;
    if (!premium) {
      router.push({ pathname: '/paywall', params: { trigger: 'channels', child: name } });
      return;
    }
    if (!req.sampleVideoId) return;
    setApprovingId(req.id);
    try {
      const res = await approveChannel(profile.id, req.sampleVideoId);
      resolveSharedRequest(profile.id, req.id);
      void refreshChannels();
      useChannelSuggestionStore.getState().set(profile.id, res.channel.channelTitle, res.suggestions);
      router.push('/(parent)/channel-approved');
    } catch (error) {
      showAppAlert('Couldn’t approve channel', channelApprovalErrorMessage(error));
    } finally {
      setApprovingId(null);
    }
  };

  /** Approve a video's whole channel from the iPad review pane; true when it went through. */
  const approveChannelFor = async (providerVideoId: string): Promise<boolean> => {
    if (!profile) return false;
    if (!premium) {
      router.push({ pathname: '/paywall', params: { trigger: 'channels', child: name } });
      return false;
    }
    try {
      const res = await approveChannel(profile.id, providerVideoId);
      void refreshChannels();
      useChannelSuggestionStore.getState().set(profile.id, res.channel.channelTitle, res.suggestions);
      router.push('/(parent)/channel-approved');
      return true;
    } catch (error) {
      showAppAlert('Couldn’t approve channel', channelApprovalErrorMessage(error));
      return false;
    }
  };

  const onApprovePending = async (item: PendingVideo) => {
    setPending((list) => list.filter((p) => p.id !== item.id));
    try {
      await approvePending(item.id);
      const latest = useAppStore.getState().childProfiles.find((c) => c.id === profile?.id);
      if (latest) void syncFamilyPlaylists([latest]).catch(() => {});
    } catch {
      showAppAlert('Couldn’t approve video', 'Check your connection and try again.');
      void refreshPending();
    }
  };

  const onRejectPending = async (item: PendingVideo) => {
    setPending((list) => list.filter((p) => p.id !== item.id));
    try {
      await rejectPending(item.id);
    } catch {
      void refreshPending();
    }
  };

  const name = profile?.nickname ?? 'Your child';
  const liveVideos = useMemo(() => videos.filter((v) => (v.status ?? 'live') === 'live'), [videos]);
  const reviewVideos = useMemo(() => videos.filter((v) => v.status === 'review'), [videos]);
  const channelRequests = visibleRequests.filter((req) => req.kind === 'channel');
  const moreRequests = visibleRequests.filter((req) => req.kind !== 'channel');
  const waitingCount = reviewVideos.length + pending.length;

  // Approve straight from the list: the same commit the Review screen makes,
  // without the detour for a video the parent already knows.
  const onApproveReview = async (item: PlaylistVideo) => {
    if (!profile) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const result = await commitApprovedVideo(profile.id, item.video, item.id);
      if (result === 'limit') {
        router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: name } });
      }
    } catch {
      showAppAlert('Couldn’t approve video', 'Check your connection and try again.');
    }
  };

  const onDeclineReview = (item: PlaylistVideo) => {
    if (!profile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void removeSharedVideo(profile.id, item).catch(() => {});
  };


  const goPaste = () => {
    if (!premium && videos.length >= FREE_LIMITS.videosPerPlaylist) {
      router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: name } });
    } else {
      router.push('/(parent)/add-video');
    }
  };

  // Order is playback order in child mode, so a drag is a real settings change:
  // persist it as the finger lifts rather than staging it behind a Save button.
  const onDragEnd = ({ data }: { data: PlaylistVideo[] }) => {
    if (!profile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void reorderSharedVideos(profile.id, [...data, ...reviewVideos]).catch(() => {
      showAppAlert('Couldn’t save order', 'Refresh and try reordering again.');
    });
  };

  const confirmRemove = (item: PlaylistVideo) => {
    if (!profile) return;
    showAppAlert(
      'Remove this video?',
      `“${item.video.title}” will be removed from ${name}’s playlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void removeSharedVideo(profile.id, item).catch(() => {
              showAppAlert('Couldn’t remove video', 'Check your connection and try again.');
            });
          },
        },
      ],
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<PlaylistVideo>) => (
    <ScaleDecorator activeScale={1.04}>
      <View style={[styles.row, isActive && styles.rowActive]}>
        <Image source={{ uri: item.video.thumbnailUrl }} style={styles.thumb} transition={150} />
        <View style={styles.copy}>
          <Txt weight="extrabold" size={14.5} numberOfLines={1}>
            {item.video.title}
          </Txt>
          <Txt weight="bold" size={12} color={colors.parent.muted} numberOfLines={1}>
            {item.video.durationSeconds ? `${formatDuration(item.video.durationSeconds)} · ` : ''}
            added{' '}
            {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Txt>
        </View>
        {editing ? (
          <>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.video.title}`}
              accessibilityHint={`Removes this video from ${name}’s playlist after confirmation`}
              onPress={() => confirmRemove(item)}
              hitSlop={4}
              pressedScale={0.88}
              style={styles.deleteButton}
            >
              <AppIcon name="delete" size={24} />
            </PressableScale>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reorder ${item.video.title}`}
              onPressIn={drag}
              hitSlop={6}
              style={styles.handleTouch}
            >
              <DragHandle />
            </Pressable>
          </>
        ) : null}
      </View>
    </ScaleDecorator>
  );

  const waitingIds = [...reviewVideos.map((item) => item.id), ...pending.map((item) => item.id)];
  const activeWaiting = pickedWaiting && waitingIds.includes(pickedWaiting) ? pickedWaiting : waitingIds[0] ?? null;
  const activeChannel = channels.find((channel) => channel.id === pickedChannel) ?? channels[0] ?? null;

  /** iPad: a waiting video is a single row; it opens beside the list for the decision. */
  const waitRow = (id: string, video: PlaylistVideo['video'], tag: string, meta: string) => {
    const on = id === activeWaiting;
    return (
      <Animated.View key={id} layout={waitingLayout} exiting={FadeOutLeft.duration(220)}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Review ${video.title}`}
          accessibilityState={{ selected: on }}
          onPress={() => setPickedWaiting(id)}
          pressedScale={0.98}
          style={[styles.waitCard, styles.waitTop, on && styles.waitPicked]}
        >
          <View>
            <Image source={{ uri: video.thumbnailUrl }} style={styles.waitThumb} transition={150} />
            <View style={styles.reviewTag}>
              <Txt weight="black" size={9} color={colors.amberText}>{tag}</Txt>
            </View>
          </View>
          <View style={styles.copy}>
            <Txt weight="extrabold" size={15} numberOfLines={1}>{video.title}</Txt>
            <Txt weight="bold" size={12} color={colors.parent.muted} numberOfLines={1}>{meta}</Txt>
          </View>
          <Txt weight="black" size={22} color={colors.subtle}>›</Txt>
        </PressableScale>
      </Animated.View>
    );
  };

  const durationMeta = (video: PlaylistVideo['video']) =>
    `${video.channelTitle}${video.durationSeconds ? ` · ${formatDuration(video.durationSeconds)}` : ''}`;

  const waitingCards = (
    <>
      {split ? reviewVideos.map((item) => waitRow(item.id, item.video, 'REVIEW', durationMeta(item.video))) : null}
      {split ? pending.map((item) => waitRow(item.id, item.video, 'NEW', item.channelTitle)) : null}
      {split ? null : reviewVideos.map((item) => (
        <Animated.View key={item.id} layout={waitingLayout} exiting={FadeOutLeft.duration(220)} style={styles.waitCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Watch ${item.video.title} before approving`}
            onPress={() =>
              router.push({
                pathname: '/(parent)/review-video',
                params: { video: JSON.stringify(item.video), entryId: item.id },
              })
            }
            style={styles.waitTop}
          >
            <View>
              <Image source={{ uri: item.video.thumbnailUrl }} style={styles.waitThumb} transition={150} />
              <View style={styles.reviewTag}>
                <Txt weight="black" size={9} color={colors.amberText}>REVIEW</Txt>
              </View>
            </View>
            <View style={styles.copy}>
              <Txt weight="extrabold" size={15} numberOfLines={1}>{item.video.title}</Txt>
              <Txt weight="bold" size={12} color={colors.parent.muted} numberOfLines={1}>
                {item.video.channelTitle}
                {item.video.durationSeconds ? ` · ${formatDuration(item.video.durationSeconds)}` : ''}
              </Txt>
            </View>
          </Pressable>
          <View style={styles.decide}>
            <PressableScale accessibilityRole="button" accessibilityLabel={`Approve ${item.video.title}`} onPress={() => void onApproveReview(item)} style={[styles.decideBtn, styles.approveBtn]}>
              <Txt weight="black" size={14} color={colors.greenDark}>✓ Approve</Txt>
            </PressableScale>
            <PressableScale accessibilityRole="button" accessibilityLabel={`Decline ${item.video.title}`} onPress={() => onDeclineReview(item)} style={[styles.decideBtn, styles.declineBtn]}>
              <Txt weight="extrabold" size={14} color={colors.parent.muted}>Not for {name}</Txt>
            </PressableScale>
          </View>
        </Animated.View>
      ))}
      {split ? null : pending.map((item) => (
        <Animated.View key={item.id} layout={waitingLayout} exiting={FadeOutLeft.duration(220)} style={styles.waitCard}>
          <View style={styles.waitTop}>
            <View>
              <Image source={{ uri: item.video.thumbnailUrl }} style={styles.waitThumb} transition={150} />
              <View style={styles.reviewTag}>
                <Txt weight="black" size={9} color={colors.amberText}>NEW</Txt>
              </View>
            </View>
            <View style={styles.copy}>
              <Txt weight="extrabold" size={15} numberOfLines={2}>{item.video.title}</Txt>
              <Txt weight="bold" size={12} color={colors.parent.muted} numberOfLines={1}>{item.channelTitle}</Txt>
            </View>
          </View>
          <View style={styles.decide}>
            <PressableScale accessibilityRole="button" accessibilityLabel={`Approve ${item.video.title}`} onPress={() => void onApprovePending(item)} style={[styles.decideBtn, styles.approveBtn]}>
              <Txt weight="black" size={14} color={colors.greenDark}>✓ Approve</Txt>
            </PressableScale>
            <PressableScale accessibilityRole="button" accessibilityLabel={`Reject ${item.video.title}`} onPress={() => void onRejectPending(item)} style={[styles.decideBtn, styles.declineBtn]}>
              <Txt weight="extrabold" size={14} color={colors.parent.muted}>Not for {name}</Txt>
            </PressableScale>
          </View>
        </Animated.View>
      ))}
      {moreRequests.map((req) => (
        <Animated.View key={req.id} layout={waitingLayout} exiting={FadeOutLeft.duration(220)} style={styles.askCard}>
          {profile ? <ChildAvatar avatar={profile.avatar} size={40} /> : null}
          <View style={styles.copy}>
            <Txt weight="extrabold" size={15}>{name} asked for more videos</Txt>
            <Txt weight="bold" size={12} color={colors.parent.muted}>
              {new Date(req.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Txt>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Mark request as seen"
            onPress={() => {
              if (profile) resolveSharedRequest(profile.id, req.id);
            }}
            style={styles.softPill}
          >
            <Txt weight="black" size={13.5} color={colors.child.skyDeep}>Got it</Txt>
          </PressableScale>
        </Animated.View>
      ))}
    </>
  );

  const channelsBody = (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.segmentBody}>
      <Txt weight="bold" size={14} lineHeight={21} color={colors.parent.muted}>
        New uploads from these channels come to you first. {name} only sees the ones you approve.
      </Txt>
      {channels.length > 0 ? (
        <View style={styles.group}>
          {channels.map((channel, i) => (
            <Appear key={channel.id} index={i}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Open ${channel.channelTitle}`}
                accessibilityState={split ? { selected: channel.id === activeChannel?.id } : undefined}
                onPress={() =>
                  split
                    ? setPickedChannel(channel.id)
                    : router.push({ pathname: '/(parent)/channel', params: { id: channel.id, title: channel.channelTitle } })
                }
                pressedScale={0.98}
                style={[
                  styles.groupRow,
                  i < channels.length - 1 && styles.groupDivider,
                  split && channel.id === activeChannel?.id && styles.channelPicked,
                ]}
              >
                <View style={styles.channelArt}>
                  <AppIcon name="channels" size={30} />
                </View>
                <View style={styles.copy}>
                  <Txt weight="extrabold" size={15} numberOfLines={1}>{channel.channelTitle}</Txt>
                  {(() => {
                    const waiting = pending.filter((p) => p.channelTitle.trim().toLowerCase() === channel.channelTitle.trim().toLowerCase()).length;
                    return waiting > 0 ? (
                      <Txt weight="extrabold" size={12} color={colors.amberText}>{waiting} new to review</Txt>
                    ) : (
                      <Txt weight="bold" size={12} color={colors.parent.muted}>All caught up</Txt>
                    );
                  })()}
                </View>
                <Txt weight="black" size={22} color={colors.subtle}>›</Txt>
              </PressableScale>
            </Appear>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <AppIcon name="channels" size={56} />
          <Txt weight="black" size={16} center>No channels yet</Txt>
          <Txt weight="bold" size={13.5} color={colors.parent.muted} center lineHeight={19}>
            When {name} taps the ♥ on a video, you can approve that creator’s whole channel here.
          </Txt>
        </View>
      )}
      {channelRequests.length > 0 ? (
        <>
          <Txt weight="black" size={16} style={styles.sectionTitle}>{name} asked for</Txt>
          {channelRequests.map((req) => (
            <Animated.View key={req.id} layout={waitingLayout} exiting={FadeOutLeft.duration(220)} style={styles.askCard}>
              {profile ? <ChildAvatar avatar={profile.avatar} size={40} /> : null}
              <View style={styles.copy}>
                <Txt weight="extrabold" size={15} numberOfLines={2}>More from {req.channelTitle}</Txt>
                <Txt weight="bold" size={12} color={colors.parent.muted}>
                  {new Date(req.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </Txt>
              </View>
              {req.sampleVideoId ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Approve ${req.channelTitle} channel`}
                  disabled={approvingId === req.id}
                  onPress={() => void onApproveChannel(req)}
                  style={[styles.softPill, styles.solidPill]}
                >
                  {approvingId === req.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Txt weight="black" size={13.5} color="#FFFFFF">Approve</Txt>
                  )}
                </PressableScale>
              ) : null}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Dismiss request"
                onPress={() => {
                  if (profile) resolveSharedRequest(profile.id, req.id);
                }}
                hitSlop={6}
                style={styles.dismiss}
              >
                <Txt weight="black" size={14} color={colors.parent.muted}>✕</Txt>
              </PressableScale>
            </Animated.View>
          ))}
        </>
      ) : null}
    </Animated.View>
  );

  const subtitle =
    segment === 'channels'
      ? `${channels.length} ${channels.length === 1 ? 'channel' : 'channels'} approved`
      : `${liveVideos.length} live${waitingCount ? ` · ${waitingCount} waiting` : ''}${premium ? '' : ` · ${videos.length} of ${FREE_LIMITS.videosPerPlaylist}`}`;

  const list = (
    <ScreenContainer padded={false}>
      <DraggableFlatList
        data={segment === 'videos' ? liveVideos : []}
        keyExtractor={(item) => item.id}
        onDragEnd={onDragEnd}
        renderItem={renderItem}
        activationDistance={12}
        containerStyle={styles.listContainer}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: Math.max(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Appear index={0}>
              <ParentHeader
                title={`${name}’s playlist`}
                subtitle={subtitle}
                right={
                  segment === 'videos' && liveVideos.length > 0 ? (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={editing ? 'Finish editing playlist' : 'Edit playlist'}
                      onPress={() => setEditing((v) => !v)}
                      hitSlop={8}
                      style={[styles.editButton, editing && styles.editButtonActive]}
                    >
                      <Txt weight="extrabold" size={14} color={editing ? '#FFFFFF' : colors.child.skyDeep}>
                        {editing ? 'Done' : 'Edit'}
                      </Txt>
                    </PressableScale>
                  ) : null
                }
              />
            </Appear>
            <Appear index={1}>
              <Segmented
                options={[
                  { value: 'videos', label: 'Videos' },
                  { value: 'channels', label: 'Channels' },
                ]}
                value={segment}
                onChange={(next) => {
                  setEditing(false);
                  setSegment(next);
                }}
              />
            </Appear>
            {segment === 'channels' ? channelsBody : editing ? (
              <View style={styles.hint}>
                <Txt weight="bold" size={12.5} color={colors.parent.muted}>
                  Drag the handle to set the order {name} watches in.
                </Txt>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(200)} style={styles.segmentBody}>
                {videos.length > 0 ? (
                  <Appear index={2}>
                    <PressableScale accessibilityRole="button" accessibilityLabel="Add a video" onPress={goPaste} pressedScale={0.98} style={styles.pasteBar}>
                      <AppIcon name="add-video" size={42} style={styles.pasteIcon} />
                      <View style={styles.copy}>
                        <Txt weight="black" size={16}>Paste a YouTube link</Txt>
                        <Txt weight="bold" size={12} color={colors.child.skyDeep}>or share from the YouTube app</Txt>
                      </View>
                      <View style={styles.pasteCta}>
                        <Txt weight="black" size={14} color="#FFFFFF">Paste</Txt>
                      </View>
                    </PressableScale>
                  </Appear>
                ) : null}
                {waitingCount + moreRequests.length > 0 ? (
                  <>
                    <Txt weight="black" size={16} style={styles.sectionTitle}>Waiting for you</Txt>
                    {waitingCards}
                  </>
                ) : null}
                {liveVideos.length > 0 ? (
                  <Txt weight="black" size={16} style={styles.sectionTitle}>Live for {name}</Txt>
                ) : null}
              </Animated.View>
            )}
          </View>
        }
        ListEmptyComponent={
          segment === 'videos' && videos.length === 0 ? (
            <Appear index={2}>
              <EmptyState
                illustration={<AddVideoIllustration />}
                title="No videos yet"
                body={`Add one trusted video for ${name}. You’ll review it before it appears in Child Mode.`}
                ctaLabel="Add first video"
                onCta={goPaste}
              />
            </Appear>
          ) : null
        }
      />
    </ScreenContainer>
  );

  if (!split) return list;

  const reviewItem = reviewVideos.find((item) => item.id === activeWaiting);
  const pendingItem = pending.find((item) => item.id === activeWaiting);
  let detail;
  if (segment === 'channels') {
    detail = activeChannel ? (
      <PaneHost
        root={{ route: 'channel', params: { id: activeChannel.id, title: activeChannel.channelTitle } }}
        onExit={() => {
          setPickedChannel(null);
          void refreshChannels();
        }}
      />
    ) : (
      <PanePlaceholder text="Pick a channel to see it here" />
    );
  } else if (reviewItem) {
    detail = (
      <ReviewPane
        key={reviewItem.id}
        video={reviewItem.video}
        meta={durationMeta(reviewItem.video)}
        name={name}
        onApprove={() => onApproveReview(reviewItem)}
        onDecline={() => onDeclineReview(reviewItem)}
        onApproveChannel={() => approveChannelFor(reviewItem.video.providerVideoId)}
      />
    );
  } else if (pendingItem) {
    detail = (
      <ReviewPane
        key={pendingItem.id}
        video={pendingItem.video}
        meta={`New from ${pendingItem.channelTitle}`}
        name={name}
        onApprove={() => onApprovePending(pendingItem)}
        onDecline={() => void onRejectPending(pendingItem)}
      />
    );
  } else {
    detail = <PanePlaceholder text="Pick a video to see it here" />;
  }

  return <SplitView listWidth={listWidth} list={list} detail={detail} />;
}

const styles = StyleSheet.create({
  listContainer: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  headerBlock: { gap: 16, paddingBottom: 10 },
  segmentBody: { gap: 12 },
  sectionTitle: { marginTop: 6 },
  editButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonActive: { backgroundColor: colors.child.skyDeep },
  hint: { backgroundColor: colors.primaryTint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  pasteBar: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.child.skyDeep,
    backgroundColor: colors.primaryTint,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pasteIcon: { borderRadius: 12 },
  pasteCta: {
    height: controls.minTouchParent,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.parent.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, gap: 12, ...shadows.card },
  waitTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitThumb: { width: 84, height: 56, borderRadius: 12, backgroundColor: colors.primaryTint },
  reviewTag: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.state.review.bg,
  },
  decide: { flexDirection: 'row', gap: 8 },
  decideBtn: { flex: 1, height: controls.minTouchParent, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: colors.greenTint, borderWidth: 1.5, borderColor: '#CDEED4' },
  declineBtn: { backgroundColor: colors.parent.paper },
  askCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  softPill: {
    minHeight: controls.minTouchParent,
    minWidth: 76,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidPill: { backgroundColor: colors.parent.night },
  dismiss: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  group: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, ...shadows.card },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  groupDivider: { borderBottomWidth: 1, borderBottomColor: '#F0EBE1' },
  waitPicked: { borderWidth: 2.5, borderColor: colors.child.skyDeep, padding: 9.5 },
  channelPicked: { backgroundColor: '#DCEFF6', borderRadius: 14, marginHorizontal: -8, paddingHorizontal: 8 },
  channelArt: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 8, ...shadows.card },
  row: {
    minHeight: 68,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.parent.card,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  rowActive: { ...shadows.cardLg },
  thumb: { width: 68, height: 46, borderRadius: 10, backgroundColor: colors.primaryTint },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleTouch: {
    width: controls.minTouchParent,
    height: controls.minTouchParent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { width: 18, gap: 3 },
  handleBar: { height: 2.5, borderRadius: 2, backgroundColor: '#C9C2B7' },
});

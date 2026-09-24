import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  AnimatedFill,
  AppIcon,
  Appear,
  Breathe,
  ChildAvatar,
  Float,
  HeartButton,
  LikeToast,
  LockGlyph,
  PressableScale,
  Txt,
} from '@/components';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAppStore, useWatchBlock } from '@/stores/appStore';
import { useLikedVideoIds } from '@/stores/requestStore';
import { toggleLikeAndSync } from '@/features/family/requestSync';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { useKidPullToRefresh } from '@/features/kid/useKidPullToRefresh';
import { useLivePlaylistVideos, usePlaybackProgress } from '@/stores/playlistStore';
import { remainingSeconds, useSecondsWatchedToday } from '@/stores/timerStore';
import { timerLabel } from '@/components/TimerBadge';
import { colors, shadows } from '@/theme/tokens';
import { KID_SKIES, KID_TINTS } from '@/theme/kid';
import { springs } from '@/theme/motion';

const ASK_ART = require('../../../assets/images/characters/add-video.png');

const CARD_GAP = 10;
/** Only cards this close to the focused one render their artwork. */
const RENDER_WINDOW = 2;

interface VideoChoice {
  kind: 'video';
  id: string;
  originalIndex: number;
  providerVideoId: string;
  channelTitle: string;
  title: string;
  thumbnailUrl: string;
  hasSavedProgress: boolean;
  progress: number;
}

type CarouselItem = VideoChoice | { kind: 'ask'; id: 'ask' };

function PlayGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden>
      <Path d="M4 1.9 14.2 8 4 14.1Z" fill="#FFFFFF" strokeLinejoin="round" />
    </Svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d={direction === 'left' ? 'M15 4 7 12l8 8' : 'M9 4l8 8-8 8'}
        stroke={colors.child.skyDeep}
        strokeWidth={4.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * One slot in the carousel. Its scale and opacity follow the track's live
 * position, so neighbours grow into focus under the child's finger rather than
 * snapping when the swipe ends.
 */
const CarouselSlot = memo(function CarouselSlot({
  index,
  width,
  step,
  translateX,
  sidePad,
  children,
}: {
  index: number;
  width: number;
  step: number;
  translateX: SharedValue<number>;
  sidePad: number;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs((translateX.value - (sidePad - index * step)) / step);
    return {
      opacity: interpolate(distance, [0, 1], [1, 0.6], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1], [1, 0.9], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[{ width }, animatedStyle]}>{children}</Animated.View>;
});

function VideoCardFace({
  item,
  thumbHeight,
  liked,
  onToggleLike,
}: {
  item: VideoChoice;
  thumbHeight: number;
  liked: boolean;
  onToggleLike: (item: VideoChoice) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.thumb, { height: thumbHeight }]}>
        <Image
          source={item.thumbnailUrl}
          recyclingKey={item.id}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          priority="high"
        />
        <Breathe from={0.96} to={1.04} duration={1400} style={styles.playWrap}>
          <View style={styles.playButton}>
            <PlayGlyph size={40} />
          </View>
        </Breathe>
        <View style={styles.heart}>
          <HeartButton variant="chip" liked={liked} onToggle={() => onToggleLike(item)} />
        </View>
        {item.hasSavedProgress ? (
          <View style={styles.keepBadge}>
            <Txt weight="black" size={11} color={colors.parent.night} style={styles.keepText}>
              KEEP WATCHING
            </Txt>
          </View>
        ) : null}
        {item.progress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
          </View>
        ) : null}
      </View>
      <Txt weight="black" size={22} lineHeight={26} color={colors.parent.night} numberOfLines={2} style={styles.cardTitle}>
        {item.title}
      </Txt>
    </View>
  );
}

function AskCardFace({ thumbHeight }: { thumbHeight: number }) {
  return (
    <View style={styles.card}>
      <View style={[styles.thumb, styles.askArt, { height: thumbHeight }]}>
        <Float distance={5} sway={1.5} duration={2400}>
          <Image source={ASK_ART} style={{ width: thumbHeight * 1.34, height: thumbHeight }} contentFit="cover" />
        </Float>
      </View>
      <View style={styles.askRow}>
        <Txt weight="black" size={22} color={colors.parent.night} style={{ flex: 1 }}>
          Want more?
        </Txt>
        <Breathe from={0.95} to={1.06} duration={1200}>
          <View style={styles.askHeart}>
            <Txt weight="black" size={24} color="#FFFFFF">♥</Txt>
          </View>
        </Breathe>
      </View>
    </View>
  );
}

/**
 * Kid home: one big video at a time. Swipe, or tap the big arrows; every move
 * ticks the haptics so the carousel feels physical. No reading needed — the
 * picture, the play button and the heart carry the whole screen.
 */
export default function ChildHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet, width, height } = useResponsiveLayout();
  const contentWidth = width - insets.left - insets.right;
  const cardWidth = Math.min(contentWidth - 50, isTablet ? 620 : 520);
  const step = cardWidth + CARD_GAP;
  const sidePad = (contentWidth - cardWidth) / 2;
  // Short phones (SE) trade a little poster height so the arrows stay on screen.
  const thumbShare = isTablet ? 0.4 : height < 700 ? 0.26 : 0.31;
  const thumbHeight = Math.round(Math.min((cardWidth - 24) * 0.72, height * thumbShare));

  const profile = useAppStore(
    (state) =>
      state.childProfiles.find((candidate) => candidate.id === state.activeChildProfileId) ??
      state.childProfiles[0] ??
      null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const playbackProgress = usePlaybackProgress(profile?.id ?? null);
  const likedVideoIds = useLikedVideoIds(profile?.id ?? null);
  const likedSet = useMemo(() => new Set(likedVideoIds), [likedVideoIds]);
  const [likeToast, setLikeToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);
  const watchBlock = useWatchBlock(profile?.id ?? null);
  // Kid devices belong to one child and have no grown-up controls on them.
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const pullToRefresh = useKidPullToRefresh();

  // The last-played video leads, then the parent's playlist order.
  const items = useMemo<CarouselItem[]>(() => {
    let featured = -1;
    let latest = -1;
    videos.forEach((entry, index) => {
      const saved = playbackProgress[entry.video.providerVideoId];
      if (saved && saved.updatedAt > latest) {
        featured = index;
        latest = saved.updatedAt;
      }
    });
    const indexed = videos.map((entry, originalIndex) => ({ entry, originalIndex }));
    const ordered =
      featured > 0
        ? [indexed[featured], ...indexed.filter((item) => item.originalIndex !== featured)]
        : indexed;
    const choices: CarouselItem[] = ordered.map(({ entry, originalIndex }) => {
      const saved = playbackProgress[entry.video.providerVideoId];
      return {
        kind: 'video',
        id: entry.id,
        originalIndex,
        providerVideoId: entry.video.providerVideoId,
        channelTitle: entry.video.channelTitle,
        title: entry.video.title,
        thumbnailUrl: entry.video.thumbnailUrl,
        hasSavedProgress: Boolean(saved),
        progress: saved?.durationSeconds ? Math.min(1, saved.positionSeconds / saved.durationSeconds) : 0,
      };
    });
    return [...choices, { kind: 'ask', id: 'ask' }];
  }, [videos, playbackProgress]);

  const count = items.length;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  // The gesture runs on the UI thread and can't read a React ref, so the
  // focused slot is mirrored into a shared value for it.
  const focused = useSharedValue(0);
  const translateX = useSharedValue(sidePad);

  // A layout change (rotation, split view) re-centres the focused card.
  useEffect(() => {
    translateX.value = withSpring(sidePad - indexRef.current * step, springs.snappy);
  }, [sidePad, step, translateX]);

  // The playlist can shrink under us (a parent removed a video from their phone).
  useEffect(() => {
    if (indexRef.current > count - 1) {
      indexRef.current = Math.max(0, count - 1);
      focused.value = indexRef.current;
      setIndex(indexRef.current);
      translateX.value = withSpring(sidePad - indexRef.current * step, springs.snappy);
    }
  }, [count, focused, sidePad, step, translateX]);

  useEffect(() => {
    if (watchBlock) {
      router.replace({ pathname: '/(child)/times-up', params: { reason: watchBlock } });
      return;
    }
    if (remaining !== null && remaining <= 0) router.replace('/(child)/times-up');
  }, [watchBlock, remaining, router]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target > count - 1) {
        // The end of the line: a double bump, and the track springs home.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), 70);
        translateX.value = withSpring(sidePad - indexRef.current * step, springs.bouncy);
        return;
      }
      if (target !== indexRef.current) void Haptics.selectionAsync();
      indexRef.current = target;
      focused.value = target;
      setIndex(target);
      translateX.value = withSpring(sidePad - target * step, springs.bouncy);
    },
    [count, focused, sidePad, step, translateX],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onUpdate((event) => {
          const base = sidePad - focused.value * step;
          const raw = base + event.translationX;
          const min = sidePad - (count - 1) * step;
          // Rubber-band past either end.
          translateX.value = raw > sidePad ? sidePad + (raw - sidePad) / 3 : raw < min ? min + (raw - min) / 3 : raw;
        })
        .onEnd((event) => {
          const current = focused.value;
          const moved = -(event.translationX + event.velocityX * 0.15) / step;
          const delta = moved > 0.3 ? 1 : moved < -0.3 ? -1 : 0;
          scheduleOnRN(goTo, current + delta);
        }),
    [count, focused, goTo, sidePad, step, translateX],
  );

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const play = useCallback(
    (originalIndex: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({ pathname: '/(child)/player', params: { index: String(originalIndex) } });
    },
    [router],
  );

  const askForMore = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(child)/request');
  }, [router]);

  const toggleLike = useCallback(
    (item: VideoChoice) => {
      if (!profile) return;
      const nowLiked = toggleLikeAndSync(profile.id, {
        providerVideoId: item.providerVideoId,
        channelTitle: item.channelTitle,
        thumbnailUrl: item.thumbnailUrl,
      });
      if (nowLiked) {
        setLikeToast(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setLikeToast(false), 1800);
      }
    },
    [profile],
  );

  const onCardPress = useCallback(
    (slot: number) => {
      // A peeking neighbour comes into focus first; only the focused card acts.
      if (slot !== indexRef.current) {
        goTo(slot);
        return;
      }
      const item = items[slot];
      if (!item) return;
      if (item.kind === 'ask') askForMore();
      else play(item.originalIndex);
    },
    [askForMore, goTo, items, play],
  );

  const switchProfile = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/whos-watching');
  }, [router]);

  // A kid device has no parent zone: its grown-up door only leads to log out.
  const openGrownups = useCallback(
    () => router.push(kidDevice ? '/kid-sign-out' : '/pin-unlock'),
    [router, kidDevice],
  );

  const avatar = profile?.avatar ?? 'fox';
  const sky = KID_SKIES[avatar] ?? KID_SKIES.fox;
  const totalSeconds = profile?.dailyLimitMinutes ? profile.dailyLimitMinutes * 60 : null;
  const meter = remaining !== null && totalSeconds ? remaining / totalSeconds : 1;
  const lowTime = remaining !== null && remaining <= 120;
  const onlyAsk = count === 1;

  return (
    <View style={styles.root}>
      <LinearGradient pointerEvents="none" colors={sky} locations={[0, 0.4, 0.72]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 20, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          pullToRefresh ? (
            <RefreshControl
              refreshing={pullToRefresh.refreshing}
              onRefresh={pullToRefresh.onRefresh}
              tintColor={colors.parent.night}
              colors={[colors.primaryDark]}
            />
          ) : undefined
        }
      >
        <Appear index={0} style={styles.header}>
          {kidDevice ? (
            <View style={[styles.avatar, { backgroundColor: KID_TINTS[avatar] }]}>
              <ChildAvatar avatar={avatar} size={52} />
            </View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Switch child profile"
              onPress={switchProfile}
              pressedScale={0.9}
              style={[styles.avatar, { backgroundColor: KID_TINTS[avatar] }]}
            >
              <Float distance={3} sway={4} duration={1800}>
                <ChildAvatar avatar={avatar} size={52} />
              </Float>
            </PressableScale>
          )}
          <Txt weight="black" size={32} color={colors.parent.night} numberOfLines={1} style={{ flex: 1 }}>
            Hi, {profile?.nickname ?? 'friend'}!
          </Txt>
        </Appear>

        <Appear index={1}>
          <View
            accessibilityRole="text"
            accessibilityLabel={timerLabel(remaining)}
            style={styles.meter}
          >
            <AppIcon name="time" size={32} style={styles.meterIcon} />
            <View style={styles.meterTrack}>
              <AnimatedFill progress={meter} style={styles.meterFill}>
                <LinearGradient
                  colors={lowTime ? [colors.child.coral, colors.child.coral] : [colors.child.grass, colors.child.sun]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </AnimatedFill>
            </View>
            <Txt weight="black" size={15} color={lowTime ? colors.child.coral : colors.parent.night}>
              {remaining === null ? 'All day' : `${Math.max(0, Math.ceil(remaining / 60))} min`}
            </Txt>
          </View>
        </Appear>

        <Appear index={2} style={styles.carousel}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.track, trackStyle]}>
              {items.map((item, slot) => (
                <CarouselSlot
                  key={item.id}
                  index={slot}
                  width={cardWidth}
                  step={step}
                  sidePad={sidePad}
                  translateX={translateX}
                >
                  {Math.abs(slot - index) <= RENDER_WINDOW ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.kind === 'ask'
                          ? 'Ask a grown-up for more videos'
                          : `${item.hasSavedProgress ? 'Continue' : 'Play'} ${item.title}`
                      }
                      onPress={() => onCardPress(slot)}
                    >
                      {item.kind === 'ask' ? (
                        <AskCardFace thumbHeight={thumbHeight} />
                      ) : (
                        <VideoCardFace
                          item={item}
                          thumbHeight={thumbHeight}
                          liked={likedSet.has(item.providerVideoId)}
                          onToggleLike={toggleLike}
                        />
                      )}
                    </Pressable>
                  ) : (
                    <View style={[styles.card, { height: thumbHeight + 100 }]} />
                  )}
                </CarouselSlot>
              ))}
            </Animated.View>
          </GestureDetector>
        </Appear>

        {onlyAsk ? null : (
          <Appear index={3} style={styles.arrows}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Previous video"
              accessibilityState={{ disabled: index === 0 }}
              onPress={() => goTo(index - 1)}
              pressedScale={0.88}
              style={[styles.arrow, index === 0 && styles.arrowDim]}
            >
              <Chevron direction="left" />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Next video"
              accessibilityState={{ disabled: index === count - 1 }}
              onPress={() => goTo(index + 1)}
              pressedScale={0.88}
              style={[styles.arrow, index === count - 1 && styles.arrowDim]}
            >
              <Chevron direction="right" />
            </PressableScale>
          </Appear>
        )}

        <View style={{ flex: 1 }} />
        <Appear index={4} style={styles.grownupsWrap}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Grown-ups"
            onPress={openGrownups}
            style={styles.grownups}
          >
            <LockGlyph color="#716878" scale={0.62} />
            <Txt weight="extrabold" size={12} color="#716878">Grown-ups</Txt>
          </PressableScale>
        </Appear>
      </ScrollView>

      {likeToast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 40 }]}>
          <LikeToast text="Told your grown-up ♥" avatar={avatar} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream },
  scroll: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.child.skyDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  meter: {
    marginTop: 18,
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.92)',
    ...shadows.card,
  },
  meterIcon: { borderRadius: 10 },
  meterTrack: { flex: 1, height: 12, borderRadius: 99, backgroundColor: '#E8E0D0', overflow: 'hidden' },
  meterFill: { borderRadius: 99 },
  carousel: { marginTop: 18, overflow: 'hidden' },
  track: { flexDirection: 'row', gap: CARD_GAP, paddingTop: 14, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    padding: 12,
    paddingBottom: 18,
    gap: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 10,
  },
  thumb: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#DDEEFE' },
  playWrap: { position: 'absolute', top: '50%', left: '50%', marginLeft: -54, marginTop: -54 },
  playButton: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.child.coral,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 6,
    shadowColor: colors.child.coral,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 8,
  },
  heart: { position: 'absolute', top: 12, right: 12 },
  keepBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 99,
    backgroundColor: colors.child.sun,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  keepText: { letterSpacing: 0.3 },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, backgroundColor: 'rgba(255,255,255,.55)' },
  progressFill: { height: '100%', backgroundColor: colors.child.sun },
  cardTitle: { paddingHorizontal: 8, minHeight: 52 },
  askArt: { backgroundColor: '#C4F3E1', alignItems: 'center', justifyContent: 'center' },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, minHeight: 52 },
  askHeart: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.child.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrows: { flexDirection: 'row', justifyContent: 'center', gap: 110, marginTop: 2 },
  arrow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  arrowDim: { opacity: 0.35 },
  grownupsWrap: { alignItems: 'center', marginTop: 20 },
  grownups: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(42,59,92,.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

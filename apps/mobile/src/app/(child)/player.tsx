import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AccessibilityInfo,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { formatDuration } from '@littleloop/shared';
import { HeartButton, LikeToast, Txt } from '@/components';
import { TimerBadge } from '@/components/TimerBadge';
import { colors, shadows } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, useBedtimeReached } from '@/stores/appStore';
import { useLikedVideoIds } from '@/stores/requestStore';
import { toggleLikeAndSync } from '@/features/family/requestSync';
import { useLivePlaylistVideos, usePlaylistStore } from '@/stores/playlistStore';
import { remainingSeconds, useSecondsWatchedToday, useTimerStore } from '@/stores/timerStore';
import {
  PLAYER_ORIGIN,
  YT_STATE,
  buildPlayerHtml,
  isAllowedPlayerUrl,
  type PlayerEvent,
} from '@/features/child/playerHtml';

const CONTROLS_AUTO_HIDE_MS = 2800;

function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={styles.pauseBar} />
        <View style={styles.pauseBar} />
      </View>
    );
  }
  return (
    <Svg width={26} height={30} viewBox="0 0 26 30" style={{ marginLeft: 5 }}>
      <Path d="M1 1 L25 15 L1 29 Z" fill="#FFFFFF" />
    </Svg>
  );
}

function SeekIcon({ direction }: { direction: 'back' | 'forward' }) {
  const transform = direction === 'forward' ? 'translate(36 0) scale(-1 1)' : undefined;
  return (
    <View style={styles.seekIcon}>
      <Svg width={36} height={36} viewBox="0 0 36 36" style={StyleSheet.absoluteFill}>
        <Path
          d="M10 9H4V3 M5 9C8 4 14 2 20 4C28 6 32 14 29 22C26 30 17 33 10 29C7 27 5 25 4 22"
          transform={transform}
          stroke="rgba(255,255,255,.88)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Txt weight="black" size={10} color="#FFFFFF">
        10
      </Txt>
    </View>
  );
}

function SkipIcon({ direction }: { direction: 'previous' | 'next' }) {
  const transform = direction === 'previous' ? 'translate(22 0) scale(-1 1)' : undefined;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Path
        d="M3 3 L15 11 L3 19 Z M17 3 V19"
        transform={transform}
        stroke="rgba(255,255,255,.88)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255,255,255,.88)"
      />
    </Svg>
  );
}

function CornersIcon({ expand }: { expand: boolean }) {
  const d = expand
    ? 'M2 6 V2 H6 M12 2 H16 V6 M16 12 V16 H12 M6 16 H2 V12'
    : 'M6 2 V6 H2 M16 6 H12 V2 M12 16 V12 H16 M2 12 H6 V16';
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path d={d} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** s14/s14b — child player: WebView + IFrame bridge, native coral controls. */
export default function ChildPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const params = useLocalSearchParams<{ index?: string }>();

  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);
  const pastBedtime = useBedtimeReached(profile?.id ?? null);

  const initialIndex = Math.min(Math.max(Number(params.index ?? 0) || 0, 0), Math.max(videos.length - 1, 0));
  const [index, setIndex] = useState(initialIndex);
  const current = videos[index];
  const prevIndex = index > 0 ? index - 1 : null;
  const nextIndex = index + 1 < videos.length ? index + 1 : null;
  const next = nextIndex !== null ? videos[nextIndex] : undefined;
  const initialProgress =
    profile && current
      ? usePlaylistStore.getState().playbackProgressByChild?.[profile.id]?.[
          current.video.providerVideoId
        ]
      : undefined;

  const webviewRef = useRef<WebView>(null);
  const latestPositionRef = useRef(initialProgress?.positionSeconds ?? 0);
  const latestDurationRef = useRef(
    initialProgress?.durationSeconds ?? current?.video.durationSeconds ?? 0,
  );
  const currentIdentityRef = useRef({
    childProfileId: profile?.id ?? null,
    providerVideoId: current?.video.providerVideoId ?? null,
  });
  const lastProgressSaveRef = useRef(0);
  const [controlsOpacity] = useState(() => new Animated.Value(1));
  const controlsHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [position, setPosition] = useState(initialProgress?.positionSeconds ?? 0);
  const [duration, setDuration] = useState(
    initialProgress?.durationSeconds ?? current?.video.durationSeconds ?? 0,
  );
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [likeToast, setLikeToast] = useState(false);
  const likedVideoIds = useLikedVideoIds(profile?.id ?? null);
  const liked = current ? likedVideoIds.includes(current.video.providerVideoId) : false;
  const playing = playerState === YT_STATE.playing;
  // Two-minute warning (PLAN §13): remaining only decreases, so this window
  // passes exactly once — a derived ~4-second toast with no extra state.
  const showWarning = remaining !== null && remaining <= 120 && remaining > 116;

  // The document is created once; later videos load over the bridge.
  const html = useMemo(() => buildPlayerHtml(current?.video.providerVideoId ?? ''), []); // eslint-disable-line react-hooks/exhaustive-deps

  const command = useCallback((cmd: string, arg?: unknown) => {
    webviewRef.current?.injectJavaScript(
      `window.llCommand(${JSON.stringify(cmd)}, ${JSON.stringify(arg ?? null)}); true;`,
    );
  }, []);

  useEffect(() => {
    currentIdentityRef.current = {
      childProfileId: profile?.id ?? null,
      providerVideoId: current?.video.providerVideoId ?? null,
    };
  }, [profile?.id, current?.video.providerVideoId]);

  const clearControlsHideTimer = useCallback(() => {
    if (controlsHideTimer.current) {
      clearTimeout(controlsHideTimer.current);
      controlsHideTimer.current = null;
    }
  }, []);

  const setChromeVisible = useCallback(
    (visible: boolean) => {
      setControlsVisible(visible);
      Animated.timing(controlsOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 160 : 220,
        useNativeDriver: true,
      }).start();
    },
    [controlsOpacity],
  );

  const revealControls = useCallback(() => {
    clearControlsHideTimer();
    setChromeVisible(true);
    if (playing && !screenReaderEnabled) {
      controlsHideTimer.current = setTimeout(() => {
        setChromeVisible(false);
      }, CONTROLS_AUTO_HIDE_MS);
    }
  }, [clearControlsHideTimer, playing, screenReaderEnabled, setChromeVisible]);

  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );
    return () => subscription.remove();
  }, []);

  const persistCurrentProgress = useCallback(() => {
    const { childProfileId, providerVideoId } = currentIdentityRef.current;
    if (!childProfileId || !providerVideoId) return;
    usePlaylistStore
      .getState()
      .savePlaybackProgress(
        childProfileId,
        providerVideoId,
        latestPositionRef.current,
        latestDurationRef.current,
      );
    lastProgressSaveRef.current = Date.now();
  }, []);

  const onToggleLike = useCallback(() => {
    const active = currentIdentityRef.current;
    if (!active.childProfileId || !current) return;
    const nowLiked = toggleLikeAndSync(active.childProfileId, {
      providerVideoId: current.video.providerVideoId,
      channelTitle: current.video.channelTitle,
      thumbnailUrl: current.video.thumbnailUrl,
    });
    if (nowLiked) {
      setLikeToast(true);
      setTimeout(() => setLikeToast(false), 1800);
    }
  }, [current]);

  const seekTo = useCallback(
    (seconds: number) => {
      const target = Math.min(Math.max(seconds, 0), Math.max(duration, 0));
      latestPositionRef.current = target;
      setPosition(target);
      command('seek', target);
      revealControls();
    },
    [command, duration, revealControls],
  );

  const goTo = useCallback(
    (i: number) => {
      const target = videos[i];
      if (!target) return;
      persistCurrentProgress();
      const saved = profile
        ? usePlaylistStore.getState().playbackProgressByChild?.[profile.id]?.[
            target.video.providerVideoId
          ]
        : undefined;
      const resumeAt = saved?.positionSeconds ?? 0;
      const targetDuration = saved?.durationSeconds ?? target.video.durationSeconds ?? 0;
      currentIdentityRef.current = {
        childProfileId: profile?.id ?? null,
        providerVideoId: target.video.providerVideoId,
      };
      setIndex(i);
      setPosition(resumeAt);
      latestPositionRef.current = resumeAt;
      setDuration(targetDuration);
      latestDurationRef.current = targetDuration;
      revealControls();
      command('load', { videoId: target.video.providerVideoId, startSeconds: resumeAt });
    },
    [videos, profile, command, revealControls, persistCurrentProgress],
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: PlayerEvent;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'state') {
        setPlayerState(msg.state);
        if (msg.state === YT_STATE.ended) {
          if (profile && current) {
            usePlaylistStore
              .getState()
              .clearPlaybackProgress(profile.id, current.video.providerVideoId);
          }
          // End-state takeover (PLAN §9): never show YouTube's end screen —
          // advance within the approved playlist or leave the player.
          if (videos[index + 1]) goTo(index + 1);
          else router.back();
        } else if (msg.state === YT_STATE.paused) {
          persistCurrentProgress();
        }
      } else if (msg.type === 'time') {
        latestPositionRef.current = msg.current;
        latestDurationRef.current = msg.duration;
        setPosition(msg.current);
        if (msg.duration > 0) setDuration(msg.duration);
        if (Date.now() - lastProgressSaveRef.current >= 5000) {
          persistCurrentProgress();
        }
      } else if (msg.type === 'ready') {
        if (msg.duration > 0) {
          setDuration(msg.duration);
          latestDurationRef.current = msg.duration;
        }
        const restoreAt = latestPositionRef.current;
        if (restoreAt > 1) {
          command('seek', restoreAt);
        }
      } else if (msg.type === 'error') {
        // Unplayable video (removed/region-locked since approval): skip it.
        if (videos[index + 1]) goTo(index + 1);
        else router.back();
      }
    },
    [videos, index, goTo, router, command, profile, current, persistCurrentProgress],
  );

  // 1 Hz watch counting, only while the player reports PLAYING (PLAN §13).
  useEffect(() => {
    if (!playing || !profile || !current) return;
    const id = setInterval(() => {
      useTimerStore.getState().addSecond(profile.id, current.video.providerVideoId);
    }, 1000);
    return () => clearInterval(id);
  }, [playing, profile, current]);

  // While playing, the native chrome fades away until the screen is touched.
  // Paused/buffering states keep controls available.
  useEffect(() => {
    const id = setTimeout(() => {
      if (playing && !screenReaderEnabled) {
        revealControls();
        return;
      }
      clearControlsHideTimer();
      setChromeVisible(true);
    }, 0);
    return () => clearTimeout(id);
  }, [playing, screenReaderEnabled, revealControls, clearControlsHideTimer, setChromeVisible]);

  useEffect(() => clearControlsHideTimer, [clearControlsHideTimer]);

  // Persist the latest meaningful position when leaving the player. Writes
  // during playback are throttled above so MMKV is not updated every 500 ms.
  useEffect(
    () => () => {
      persistCurrentProgress();
    },
    [persistCurrentProgress],
  );

  // T = 0 or bedtime → pause, close the session, hand over to the break screen.
  // Bedtime cuts in mid-video regardless of how many minutes are left.
  useEffect(() => {
    if (pastBedtime) {
      command('pause');
      useTimerStore.getState().endSession('bedtime');
      router.replace({ pathname: '/(child)/times-up', params: { reason: 'bedtime' } });
      return;
    }
    if (remaining !== null && remaining <= 0) {
      command('pause');
      useTimerStore.getState().endSession('time_limit');
      router.replace('/(child)/times-up');
    }
  }, [pastBedtime, remaining, command, router]);

  // Backgrounding pauses playback (PLAN §10).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        persistCurrentProgress();
        command('pause');
      }
    });
    return () => sub.remove();
  }, [command, persistCurrentProgress]);

  // Restore portrait when the player unmounts.
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const enterFullscreen = () =>
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  const exitFullscreen = () =>
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

  // Android back mirrors the "My videos" pill: it leaves the player instead of
  // raising the child lock. Registered after the child layout's guard, so it
  // runs first (handlers fire newest-first) and the guard still owns the
  // playlist root. In fullscreen, back exits landscape rather than the video.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLandscape) {
        exitFullscreen();
        return true;
      }
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [isLandscape, router]);

  if (!current) {
    // Playlist emptied out from under us — nothing to play.
    router.back();
    return null;
  }

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const webview = (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: PLAYER_ORIGIN }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(req) => isAllowedPlayerUrl(req.url)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        allowsLinkPreview={false}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        bounces={false}
        style={{ backgroundColor: '#000' }}
      />
      {/* Transparent shield: raw touches never reach the iframe UI (PLAN §9). */}
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={revealControls} />
    </View>
  );

  const transportControls = (gap: number, mainSize: number, sideSize: number, lightSurface = false) => (
    <View style={[styles.controlsRow, { gap }]}>
      <RoundButton
        accessibilityLabel="Previous video"
        size={sideSize}
        style={lightSurface ? styles.playerSideButton : undefined}
        disabled={prevIndex === null}
        onPress={() => {
          if (prevIndex !== null) goTo(prevIndex);
        }}
      >
        <SkipIcon direction="previous" />
      </RoundButton>
      {!lightSurface ? (
        <RoundButton
          accessibilityLabel="Go back 10 seconds"
          size={sideSize}
          onPress={() => seekTo(position - 10)}
        >
          <SeekIcon direction="back" />
        </RoundButton>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause video' : 'Play video'}
        onPress={() => {
          revealControls();
          command(playing ? 'pause' : 'play');
        }}
        style={[
          shadows.coralButton,
          {
            width: mainSize,
            height: mainSize,
            borderRadius: mainSize / 2,
            backgroundColor: colors.child.coral,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <PlayPauseIcon playing={playing} />
      </Pressable>
      {!lightSurface ? (
        <RoundButton
          accessibilityLabel="Go forward 10 seconds"
          size={sideSize}
          onPress={() => seekTo(position + 10)}
        >
          <SeekIcon direction="forward" />
        </RoundButton>
      ) : null}
      <RoundButton
        accessibilityLabel="Next video"
        size={sideSize}
        style={lightSurface ? styles.playerSideButton : undefined}
        disabled={nextIndex === null}
        onPress={() => {
          if (nextIndex !== null) goTo(nextIndex);
        }}
      >
        <SkipIcon direction="next" />
      </RoundButton>
    </View>
  );

  const progressBar = (lightSurface = false) => (
    <View style={styles.progressRow}>
      <Txt weight="bold" size={12} color={lightSurface ? colors.parent.muted : 'rgba(255,255,255,.7)'}>
        {formatDuration(Math.floor(position))}
      </Txt>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Video timeline"
        accessibilityValue={{
          min: 0,
          max: Math.floor(duration),
          now: Math.floor(position),
          text: `${formatDuration(Math.floor(position))} of ${formatDuration(Math.floor(duration))}`,
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Forward 10 seconds' },
          { name: 'decrement', label: 'Back 10 seconds' },
        ]}
        onAccessibilityAction={(event) =>
          seekTo(position + (event.nativeEvent.actionName === 'increment' ? 10 : -10))
        }
        onLayout={(event) => setProgressTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => {
          if (progressTrackWidth <= 0 || duration <= 0) return;
          seekTo((event.nativeEvent.locationX / progressTrackWidth) * duration);
        }}
        style={styles.trackTouch}
      >
        <View style={[styles.track, lightSurface && styles.trackLight]}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          <View style={[styles.scrubber, { left: `${progress * 100}%` }]} />
        </View>
      </Pressable>
      <Txt weight="bold" size={12} color={lightSurface ? colors.parent.muted : 'rgba(255,255,255,.7)'}>
        {formatDuration(Math.floor(duration))}
      </Txt>
    </View>
  );

  const backPill = (onPress: () => void, lightSurface = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to my videos"
      onPress={() => {
        revealControls();
        onPress();
      }}
      style={[styles.backPill, lightSurface && styles.backPillLight]}
    >
      <Svg width={10} height={16} viewBox="0 0 10 16">
        <Path
          d="M8 2 L2 8 L8 14"
          stroke={lightSurface ? colors.parent.night : 'rgba(255,255,255,.85)'}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Txt weight="extrabold" size={14} color={lightSurface ? colors.parent.night : 'rgba(255,255,255,.9)'}>
        Videos
      </Txt>
    </Pressable>
  );

  const warningOverlay = showWarning ? (
    <View pointerEvents="none" style={styles.warningToast}>
      <Txt weight="extrabold" size={15} color="#FFFFFF">
        2 minutes left!
      </Txt>
    </View>
  ) : null;

  if (isLandscape) {
    // s14b — fullscreen landscape: video fills the screen, controls float above.
    return (
      <View style={styles.landscapeRoot}>
        {webview}
        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        >
          <LinearGradient
            colors={['rgba(9,14,26,.45)', 'rgba(9,14,26,0)', 'rgba(9,14,26,0)', 'rgba(9,14,26,.55)']}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.landscapeTop, { top: insets.top + 8, left: insets.left + 16, right: insets.right + 16 }]}>
            {backPill(() => {
              exitFullscreen();
            })}
            <Txt weight="extrabold" size={15} color="rgba(255,255,255,.9)" numberOfLines={1} style={{ flexShrink: 1, marginHorizontal: 12 }}>
              {current.video.title}
            </Txt>
            <TimerBadge remainingSeconds={remaining} variant="dark" />
          </View>
          <View style={styles.landscapeCenter} pointerEvents="box-none">
            {transportControls(36, 76, 56)}
          </View>
          <View style={[styles.landscapeBottom, { bottom: insets.bottom + 14, left: insets.left + 16, right: insets.right + 16 }]}>
            <View style={{ flex: 1 }}>{progressBar()}</View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit full screen"
              onPress={() => {
                revealControls();
                exitFullscreen();
              }}
              style={styles.cornerButton}
            >
              <CornersIcon expand={false} />
            </Pressable>
          </View>
        </Animated.View>
        {warningOverlay}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        {backPill(() => router.back(), true)}
        <TimerBadge remainingSeconds={remaining} variant="compact" />
      </View>

      <View style={styles.videoBox}>
        {webview}
        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[styles.cornerInVideo, { opacity: controlsOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter full screen"
            onPress={() => {
              revealControls();
              enterFullscreen();
            }}
            style={styles.cornerButton}
          >
            <CornersIcon expand />
          </Pressable>
        </Animated.View>
      </View>

      <Txt weight="extrabold" size={19} color={colors.parent.night} style={{ marginTop: 18 }} numberOfLines={2}>
        {current.video.title}
      </Txt>
      <View style={{ marginTop: 12 }}>{progressBar(true)}</View>

      <View style={{ marginTop: 20 }}>{transportControls(20, 72, 52, true)}</View>

      <View style={styles.likeRow}>
        <HeartButton
          liked={liked}
          onToggle={onToggleLike}
          variant="pill"
          label="I like this!"
          likedLabel="You liked this 💛"
        />
      </View>

      <View style={{ flex: 1 }} />

      {next ? (
        <>
          <Txt weight="extrabold" size={12} color={colors.parent.muted} style={styles.upNextLabel}>
            {`Up next in ${profile?.nickname ?? 'the'}’s playlist`.toUpperCase()}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play next video, ${next.video.title}`}
            onPress={() => {
              if (nextIndex !== null) goTo(nextIndex);
            }}
            style={styles.upNextCard}
          >
            <View style={styles.upNextThumb}>
              <Image
                source={{ uri: next.video.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Txt weight="extrabold" size={13.5} color={colors.parent.night} numberOfLines={1}>
                {next.video.title}
              </Txt>
              <Txt weight="bold" size={11.5} color={colors.greenDark} style={{ marginTop: 2 }}>
                {next.video.durationSeconds
                  ? `✓ parent-approved · ${formatDuration(next.video.durationSeconds)}`
                  : '✓ parent-approved'}
              </Txt>
            </View>
          </Pressable>
        </>
      ) : null}
      {warningOverlay}
      {likeToast ? (
        <View pointerEvents="none" style={styles.likeToastWrap}>
          <LikeToast text="Told your grown-up 💛" />
        </View>
      ) : null}
    </View>
  );
}

function RoundButton({
  children,
  size,
  onPress,
  accessibilityLabel,
  disabled,
  style,
}: {
  children: React.ReactNode;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,.1)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream, paddingHorizontal: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  backPillLight: { backgroundColor: '#FFFFFF', ...shadows.card },
  videoBox: {
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1D2C4D',
  },
  cornerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerInVideo: { position: 'absolute', bottom: 10, right: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackTouch: { flex: 1, height: 44, justifyContent: 'center' },
  track: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,.14)',
  },
  trackLight: { backgroundColor: '#DED8CE' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.child.sun },
  scrubber: {
    position: 'absolute',
    top: -3,
    width: 13,
    height: 13,
    marginLeft: -6.5,
    borderRadius: 6.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.child.sun,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  playerSideButton: { backgroundColor: colors.parent.night },
  pauseBar: { width: 7, height: 26, borderRadius: 3, backgroundColor: '#FFFFFF' },
  seekIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  likeRow: { marginTop: 18, alignItems: 'center' },
  likeToastWrap: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center' },
  upNextLabel: { letterSpacing: 0.84, marginBottom: 10 },
  upNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    borderRadius: 18,
    padding: 10,
  },
  upNextThumb: {
    width: 78,
    height: 50,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: colors.coralTint,
  },
  warningToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: colors.amber,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...shadows.cardLg,
  },
  landscapeRoot: { flex: 1, backgroundColor: '#000' },
  landscapeTop: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  landscapeCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeBottom: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});

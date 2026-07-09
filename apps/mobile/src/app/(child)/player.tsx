import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
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
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { formatDuration } from '@littleloop/shared';
import { Txt } from '@/components';
import { TimerBadge } from '@/components/TimerBadge';
import { colors, shadows } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
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

function SkipIcon({ direction }: { direction: 'prev' | 'next' }) {
  const triangle = (
    <Svg width={12} height={15} viewBox="0 0 12 15">
      <Path
        d={direction === 'next' ? 'M1 1 L11 7.5 L1 14 Z' : 'M11 1 L1 7.5 L11 14 Z'}
        fill="rgba(255,255,255,.85)"
      />
    </Svg>
  );
  const bar = <View style={styles.skipBar} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {direction === 'prev' ? bar : triangle}
      {direction === 'prev' ? triangle : bar}
    </View>
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
  const videos = usePlaylistVideos(profile?.id ?? null);
  const watched = useSecondsWatchedToday(profile?.id ?? null);
  const remaining = remainingSeconds(profile?.dailyLimitMinutes, watched);

  const initialIndex = Math.min(Math.max(Number(params.index ?? 0) || 0, 0), Math.max(videos.length - 1, 0));
  const [index, setIndex] = useState(initialIndex);
  const current = videos[index];
  const nextIndex = videos.length > 1 ? (index + 1) % videos.length : null;
  const next = nextIndex !== null ? videos[nextIndex] : undefined;

  const webviewRef = useRef<WebView>(null);
  const latestPositionRef = useRef(0);
  const latestPlayingRef = useRef(false);
  const [controlsOpacity] = useState(() => new Animated.Value(1));
  const controlsHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(current?.video.durationSeconds ?? 0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const playing = playerState === YT_STATE.playing;
  // Two-minute warning (PLAN §13): remaining only decreases, so this window
  // passes exactly once — a derived ~4-second toast with no extra state.
  const showWarning = remaining !== null && remaining <= 120 && remaining > 116;

  // The document is created once; later videos load over the bridge.
  const html = useMemo(() => buildPlayerHtml(current?.video.providerVideoId ?? ''), []); // eslint-disable-line react-hooks/exhaustive-deps

  const command = useCallback((cmd: string, arg?: number | string) => {
    webviewRef.current?.injectJavaScript(
      `window.llCommand(${JSON.stringify(cmd)}, ${JSON.stringify(arg ?? null)}); true;`,
    );
  }, []);

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
    if (playing) {
      controlsHideTimer.current = setTimeout(() => {
        setChromeVisible(false);
      }, CONTROLS_AUTO_HIDE_MS);
    }
  }, [clearControlsHideTimer, playing, setChromeVisible]);

  const goTo = useCallback(
    (i: number) => {
      const target = videos[i];
      if (!target) return;
      setIndex(i);
      setPosition(0);
      latestPositionRef.current = 0;
      setDuration(target.video.durationSeconds ?? 0);
      revealControls();
      command('load', target.video.providerVideoId);
    },
    [videos, command, revealControls],
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
        latestPlayingRef.current = msg.state === YT_STATE.playing;
        setPlayerState(msg.state);
        if (msg.state === YT_STATE.ended) {
          // End-state takeover (PLAN §9): never show YouTube's end screen —
          // advance within the approved playlist or leave the player.
          if (videos[index + 1]) goTo(index + 1);
          else router.back();
        }
      } else if (msg.type === 'time') {
        latestPositionRef.current = msg.current;
        setPosition(msg.current);
        if (msg.duration > 0) setDuration(msg.duration);
      } else if (msg.type === 'ready') {
        if (msg.duration > 0) setDuration(msg.duration);
        const restoreAt = latestPositionRef.current;
        if (restoreAt > 1) {
          command('seek', restoreAt);
          if (!latestPlayingRef.current) {
            command('pause');
          }
        }
      } else if (msg.type === 'error') {
        // Unplayable video (removed/region-locked since approval): skip it.
        if (videos[index + 1]) goTo(index + 1);
        else router.back();
      }
    },
    [videos, index, goTo, router, command],
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
      if (playing) {
        revealControls();
        return;
      }
      clearControlsHideTimer();
      setChromeVisible(true);
    }, 0);
    return () => clearTimeout(id);
  }, [playing, revealControls, clearControlsHideTimer, setChromeVisible]);

  useEffect(() => clearControlsHideTimer, [clearControlsHideTimer]);

  // T = 0 → pause, close the session, hand over to the break screen.
  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      command('pause');
      useTimerStore.getState().endSession('time_limit');
      router.replace('/(child)/times-up');
    }
  }, [remaining, command, router]);

  // Backgrounding pauses playback (PLAN §10).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') command('pause');
    });
    return () => sub.remove();
  }, [command]);

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
      <Pressable style={StyleSheet.absoluteFill} onPress={revealControls} />
    </View>
  );

  const transportControls = (gap: number, mainSize: number, sideSize: number) => (
    <View style={[styles.controlsRow, { gap }]}>
      <RoundButton size={sideSize} disabled={index === 0} onPress={() => goTo(index - 1)}>
        <SkipIcon direction="prev" />
      </RoundButton>
      <Pressable
        onPress={() => {
          revealControls();
          command(playing ? 'pause' : 'play');
        }}
        style={[shadows.coralButton, { borderRadius: mainSize / 2 }]}
      >
        <LinearGradient
          colors={['#FF9A8B', '#FF8A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: mainSize,
            height: mainSize,
            borderRadius: mainSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayPauseIcon playing={playing} />
        </LinearGradient>
      </Pressable>
      <RoundButton
        size={sideSize}
        disabled={nextIndex === null}
        onPress={() => {
          if (nextIndex !== null) goTo(nextIndex);
        }}
      >
        <SkipIcon direction="next" />
      </RoundButton>
    </View>
  );

  const progressBar = (light?: boolean) => (
    <View style={styles.progressRow}>
      <Txt weight="bold" size={12} color={light ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.6)'}>
        {formatDuration(Math.floor(position))}
      </Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Txt weight="bold" size={12} color={light ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.6)'}>
        {formatDuration(Math.floor(duration))}
      </Txt>
    </View>
  );

  const backPill = (onPress: () => void) => (
    <Pressable
      onPress={() => {
        revealControls();
        onPress();
      }}
      style={styles.backPill}
    >
      <Svg width={10} height={16} viewBox="0 0 10 16">
        <Path
          d="M8 2 L2 8 L8 14"
          stroke="rgba(255,255,255,.85)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Txt weight="extrabold" size={14} color="rgba(255,255,255,.9)">
        My videos
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
            <View style={{ flex: 1 }}>{progressBar(true)}</View>
            <Pressable
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
      <View style={styles.headerRow}>
        {backPill(() => router.back())}
        <TimerBadge remainingSeconds={remaining} variant="dark" />
      </View>

      <View style={styles.videoBox}>
        {webview}
        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[styles.cornerInVideo, { opacity: controlsOpacity }]}
        >
          <Pressable
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

      <Txt weight="extrabold" size={18} color="#FFFFFF" style={{ marginTop: 18 }} numberOfLines={2}>
        {current.video.title}
      </Txt>
      <View style={{ marginTop: 14 }}>{progressBar()}</View>

      <View style={{ marginTop: 26 }}>{transportControls(26, 78, 58)}</View>

      <View style={{ flex: 1 }} />

      {next ? (
        <>
          <Txt weight="extrabold" size={12} color="rgba(255,255,255,.45)" style={styles.upNextLabel}>
            {`Up next in ${profile?.nickname ?? 'the'}’s playlist`.toUpperCase()}
          </Txt>
          <Pressable
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
              <Txt weight="extrabold" size={13.5} color="#FFFFFF" numberOfLines={1}>
                {next.video.title}
              </Txt>
              <Txt weight="semibold" size={11.5} color="rgba(255,255,255,.5)" style={{ marginTop: 2 }}>
                {next.video.durationSeconds
                  ? `${formatDuration(next.video.durationSeconds)} · parent-approved`
                  : 'parent-approved'}
              </Txt>
            </View>
          </Pressable>
        </>
      ) : null}
      {warningOverlay}
    </View>
  );
}

function RoundButton({
  children,
  size,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  size: number;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
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
  root: { flex: 1, backgroundColor: colors.playerBg, paddingHorizontal: 24 },
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
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,.14)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pauseBar: { width: 7, height: 26, borderRadius: 3, backgroundColor: '#FFFFFF' },
  skipBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.85)' },
  upNextLabel: { letterSpacing: 0.84, marginBottom: 10 },
  upNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: 18,
    padding: 10,
  },
  upNextThumb: {
    width: 78,
    height: 50,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,138,122,.25)',
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

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { requireOptionalNativeModule } from 'expo-modules-core';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { extractYouTubeId, formatDuration, type VideoMeta } from '@littleloop/shared';
import { AppDialogHost, AppIcon, Button, ChildAvatar, PopIn, PressableScale, showAppAlert, Txt } from '@/components';
import { colors, controls, exactType, typography } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { springs } from '@/theme/motion';
import { previewVideo, VideoPreviewError, VIDEO_ERROR_MESSAGES } from '@/lib/videos';
import { recordHappyMoment } from '@/lib/review';
import { useAppStore } from '@/stores/appStore';
import { usePremium } from '@/stores/entitlementStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { commitApprovedVideo } from '@/features/family/playlistSync';
import { approveChannel, channelApprovalErrorMessage } from '@/features/channels/channelsApi';
import { useChannelSuggestionStore } from '@/features/channels/channelSuggestionStore';

/**
 * expo-clipboard is native: a dev client built before it was added has no such
 * module, and importing it would crash the screen. Load it only when present.
 */
const clipboardAvailable = requireOptionalNativeModule('ExpoClipboard') != null;

async function readClipboard(): Promise<string> {
  if (!clipboardAvailable) return '';
  const Clipboard = await import('expo-clipboard');
  return Clipboard.getStringAsync();
}

/** Wait this long after typing stops before fetching the preview. */
const PREVIEW_DEBOUNCE_MS = 450;

interface AddVideoSheetProps {
  /** A link handed in from outside (the YouTube share button): prefilled and previewed at once. */
  initialLink?: string;
  /** Shown instead of the helper line, e.g. when a share carried no usable link. */
  initialError?: string | null;
  /** Called once the sheet has slid away. Defaults to going back. */
  onClosed?: () => void;
  /** Consume an external share before navigating to the approved channel. */
  onChannelApproved?: () => void;
}

/**
 * 18d — Add a video. Paste a link and the preview appears on its own; pick which
 * children get it, optionally approve the whole channel, and add. Tapping "Add"
 * is the parent's approval, so there is no separate review step.
 *
 * Used by the in-app Add video route and by the YouTube share target, which
 * arrives with the link already filled in.
 */
export function AddVideoSheet({ initialLink = '', initialError = null, onClosed, onChannelApproved }: AddVideoSheetProps) {
  const router = useRouter();
  const premium = usePremium();
  const profiles = useAppStore((s) => s.childProfiles);
  const activeId = useAppStore((s) => s.activeChildProfileId ?? s.childProfiles[0]?.id ?? null);
  const [input, setInput] = useState(initialLink);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<VideoMeta | null>(null);
  const [chosen, setChosen] = useState<string[]>(activeId ? [activeId] : []);
  const [wholeChannel, setWholeChannel] = useState(false);
  // The parent confirms they've looked at the video before it can reach a child.
  const [checked, setChecked] = useState(false);
  const checkedFor =
    profiles
      .filter((kid) => chosen.includes(kid.id))
      .map((kid) => kid.nickname)
      .join(' and ') || 'your child';
  const [saving, setSaving] = useState(false);
  const request = useRef(0);

  const linkId = extractYouTubeId(input);

  // Fetch the preview as soon as the field holds a real link.
  useEffect(() => {
    const ticket = ++request.current;
    setVideo(null);
    setChecked(false);
    setLoading(false);
    if (!linkId) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const meta = await previewVideo(input);
        if (ticket !== request.current) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Get the keyboard out of the way so the choices and the button show.
        Keyboard.dismiss();
        setVideo(meta);
      } catch (err) {
        if (ticket !== request.current) return;
        setError(err instanceof VideoPreviewError ? err.message : VIDEO_ERROR_MESSAGES.VIDEO_UNAVAILABLE);
      } finally {
        if (ticket === request.current) setLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ++request.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  const insets = useSafeAreaInsets();
  // iPad: a centred card over the dimmed screen instead of a bottom sheet.
  const { isTablet } = useResponsiveLayout();
  const { height: windowHeight } = useWindowDimensions();

  // The sheet is not always full-screen: from the YouTube share button it opens
  // where the PIN gate was, which the system may draw lower than the top of the
  // screen. So measure where it really sits, and how much of it the keyboard
  // covers, rather than trusting the window size or KeyboardAvoidingView.
  const rootRef = useRef<View>(null);
  const [frame, setFrame] = useState<{ y: number; height: number } | null>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const measure = () => rootRef.current?.measureInWindow((_x, y, _w, height) => setFrame({ y, height }));
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    // Ride the keyboard's own animation on iOS instead of jumping when it lands.
    const follow = (duration?: number) => {
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.create(duration || 250, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity));
      }
    };
    // Re-measure with every keyboard change too: a first measurement taken while
    // the screen was still sliding in would put the sheet in the wrong place.
    const show = Keyboard.addListener(showEvent, (event) => {
      measure();
      follow(event.duration);
      setKeyboardTop(event.endCoordinates.screenY);
    });
    const hide = Keyboard.addListener(hideEvent, (event) => {
      measure();
      follow(event.duration);
      setKeyboardTop(null);
    });
    const settled = setTimeout(measure, 450);
    return () => {
      show.remove();
      hide.remove();
      clearTimeout(settled);
    };
  }, []);
  const containerHeight = frame?.height ?? windowHeight;
  const keyboardOverlap =
    keyboardTop !== null && frame ? Math.max(0, frame.y + frame.height - keyboardTop) : 0;
  // A container that starts below the status bar needs no top inset of its own.
  const topClearance = frame && frame.y > insets.top ? 12 : insets.top + 12;
  // Never taller than the space left: the middle scrolls, the button stays put.
  const maxSheetHeight = containerHeight - keyboardOverlap - topClearance - (isTablet ? 68 : 0);
  // Opened from Today, Playlist or onboarding: close back to wherever that was.
  const leave = () => {
    if (onClosed) onClosed();
    else if (router.canGoBack()) router.back();
    else router.replace('/(parent)/(tabs)/playlist');
  };

  // Pull the sheet down to dismiss it; a short tug springs back.
  const dragY = useSharedValue(0);
  const shade = useSharedValue(1);
  const closing = useRef(false);
  /** Slide the sheet away and fade the dim, then pop the (transparent) route. */
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    shade.value = withTiming(0, { duration: 220 });
    dragY.value = withTiming(900, { duration: 240 }, (done) => {
      if (done) scheduleOnRN(leave);
    });
  };
  const dragToClose = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) scheduleOnRN(close);
      else dragY.value = withSpring(0, springs.snappy);
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  const paste = async () => {
    const text = (await readClipboard().catch(() => '')).trim();
    if (!text) {
      setError('Nothing to paste. Copy a link in the YouTube app first.');
      return;
    }
    void Haptics.selectionAsync();
    setError(null);
    setInput(text);
  };

  const toggleChild = (id: string) =>
    setChosen((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const toggleChannel = (next: boolean) => {
    if (next && !premium) {
      const child = profiles.find((p) => p.id === chosen[0]);
      router.push({ pathname: '/paywall', params: { trigger: 'channels', child: child?.nickname ?? 'Your child' } });
      return;
    }
    setWholeChannel(next);
  };

  const add = async () => {
    if (!video || chosen.length === 0 || saving) return;
    setSaving(true);
    const kids = profiles.filter((p) => chosen.includes(p.id));
    const full: string[] = [];
    const already: string[] = [];
    let added = 0;
    try {
      for (const kid of kids) {
        // Ticked: it goes live now. Unticked: it waits under "Waiting for you"
        // (a device-local review entry) until the parent approves it later.
        const result = checked
          ? await commitApprovedVideo(kid.id, video)
          : usePlaylistStore.getState().addVideo(kid.id, video, 'review');
        if (result === 'limit') full.push(kid.nickname);
        else if (result === 'duplicate') already.push(kid.nickname);
        else added += 1;
      }
    } catch {
      setSaving(false);
      showAppAlert('Couldn’t add video', 'Check your connection and try again.');
      return;
    }

    if (wholeChannel) {
      try {
        let lastTitle = '';
        for (const kid of kids) {
          const res = await approveChannel(kid.id, video.providerVideoId);
          lastTitle = res.channel.channelTitle;
          useChannelSuggestionStore.getState().set(kid.id, res.channel.channelTitle, res.suggestions);
        }
        setSaving(false);
        if (lastTitle) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onChannelApproved?.();
          router.replace('/(parent)/channel-approved');
          return;
        }
      } catch (err) {
        setSaving(false);
        showAppAlert('Video added, channel not approved', channelApprovalErrorMessage(err));
        return;
      }
    }
    setSaving(false);

    if (full.length > 0) {
      router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: full[0] } });
      return;
    }
    if (added === 0 && already.length > 0) {
      setError(`Already in ${already.join(' and ')}’s playlist.`);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close();
    // Rating ask only after a video actually went live, not one parked for review.
    if (checked) recordHappyMoment();
  };

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure}>
      <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, shadeStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.backdrop} />
      </Animated.View>
      <View style={[styles.avoider, isTablet && styles.avoiderCentered, { paddingBottom: keyboardOverlap + (isTablet ? 40 : 0) }]} pointerEvents="box-none">
          <Animated.View
            entering={isTablet ? ZoomIn.springify().damping(20).stiffness(220) : SlideInDown.springify().damping(22).stiffness(200)}
            style={[
              styles.sheet,
              // Resting on the keyboard there is no home indicator to clear.
              isTablet ? styles.card : { paddingBottom: keyboardOverlap > 0 ? 16 : Math.max(insets.bottom, 16) + 16 },
              { maxHeight: maxSheetHeight },
              dragStyle,
            ]}
          >
            {/* Only the header drags the sheet down, so the body can scroll freely. */}
            <GestureDetector gesture={dragToClose}>
              <View style={styles.header}>
                {isTablet ? null : <View style={styles.grabber} />}
                <View style={styles.titleRow}>
                  <Txt weight="black" size={isTablet ? exactType(26) : 24}>Add a video</Txt>
                  <PressableScale accessibilityRole="button" accessibilityLabel="Close" onPress={close} pressedScale={0.9} style={styles.closeBtn}>
                    <Txt weight="black" size={17} color={colors.parent.muted}>✕</Txt>
                  </PressableScale>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >

              <View style={[styles.field, error ? styles.fieldError : null]}>
                <TextInput
                  value={input}
                  onChangeText={(next) => {
                    setInput(next);
                    if (error) setError(null);
                  }}
                  placeholder="Paste a YouTube link"
                  placeholderTextColor="rgba(22,112,139,.55)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, input.length > 0 && styles.inputMono]}
                  returnKeyType="done"
                />
                {input.length > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear link" onPress={() => setInput('')} hitSlop={8} style={styles.clear}>
                    <Svg width={10} height={10} viewBox="0 0 10 10">
                      <Path d="M1 1 L9 9 M9 1 L1 9" stroke={colors.child.skyDeep} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  </Pressable>
                ) : clipboardAvailable ? (
                  <PressableScale accessibilityRole="button" accessibilityLabel="Paste link" onPress={() => void paste()} pressedScale={0.92} style={styles.pasteBtn}>
                    <Txt weight="black" size={14} color="#FFFFFF">Paste</Txt>
                  </PressableScale>
                ) : null}
              </View>

              {error ? (
                <Animated.View entering={FadeIn}>
                  <Txt weight="bold" size={13} color={colors.red}>{error}</Txt>
                </Animated.View>
              ) : loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.child.skyDeep} />
                  <Txt weight="bold" size={13} color={colors.parent.muted}>Finding the video…</Txt>
                </View>
              ) : !video ? (
                <Txt weight="bold" size={13} lineHeight={19} color={colors.parent.muted}>
                  {clipboardAvailable
                    ? 'Copy a link in YouTube, then tap Paste.'
                    : 'Copy a link in YouTube, then long-press the field to paste it.'}
                </Txt>
              ) : null}

              {video ? (
                <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.stack}>
                  <View style={styles.preview}>
                    <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={200} />
                    <View style={styles.copy}>
                      <Txt weight="extrabold" size={15} numberOfLines={1}>{video.title}</Txt>
                      <Txt weight="bold" size={12.5} color={colors.parent.muted} numberOfLines={1}>
                        {video.channelTitle}
                        {video.durationSeconds ? ` · ${formatDuration(video.durationSeconds)}` : ''}
                      </Txt>
                    </View>
                    <PopIn delay={150} style={styles.okBadge}>
                      <Txt weight="black" size={15} color="#FFFFFF">✓</Txt>
                    </PopIn>
                  </View>

                  {profiles.length > 1 ? (
                    <>
                      <Txt weight="black" size={15}>Add for</Txt>
                      <View style={styles.kids}>
                        {profiles.map((kid) => {
                          const on = chosen.includes(kid.id);
                          return (
                            <PressableScale
                              key={kid.id}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              accessibilityLabel={`Add for ${kid.nickname}`}
                              onPress={() => toggleChild(kid.id)}
                              haptic="select"
                              pressedScale={0.94}
                              style={[styles.kid, on && styles.kidOn]}
                            >
                              <ChildAvatar avatar={kid.avatar} size={32} />
                              <Txt weight="extrabold" size={15} color={on ? '#FFFFFF' : colors.parent.muted} numberOfLines={1}>
                                {kid.nickname}
                              </Txt>
                              {on ? (
                                <PopIn key={`on-${kid.id}`}>
                                  <Txt weight="black" size={13} color="#FFFFFF">✓</Txt>
                                </PopIn>
                              ) : null}
                            </PressableScale>
                          );
                        })}
                      </View>
                    </>
                  ) : null}

                  <PressableScale
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => setChecked((on) => !on)}
                    haptic={checked ? 'light' : 'medium'}
                    pressedScale={0.97}
                    style={[styles.checkRow, checked && styles.checkRowOn]}
                  >
                    <View style={[styles.checkBox, { backgroundColor: checked ? colors.green : '#D6DEE9' }]}>
                      <Svg width={11} height={9} viewBox="0 0 11 9">
                        <Path d="M1.5 4.5 L4 7 L9.5 1.5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    </View>
                    <Txt weight="extrabold" size={14.5} lineHeight={20} color={checked ? colors.greenDark : colors.parent.muted} style={{ flex: 1 }}>
                      I’ve checked it. It’s OK for {checkedFor}.
                    </Txt>
                  </PressableScale>

                  <View style={styles.channelRow}>
                    <AppIcon name="channels" size={32} style={{ borderRadius: 10 }} />
                    <View style={styles.copy}>
                      <Txt weight="extrabold" size={14.5}>Approve the whole channel</Txt>
                      <Txt weight="bold" size={12} color={colors.parent.muted}>New uploads come to you first</Txt>
                    </View>
                    <Switch
                      value={wholeChannel}
                      onValueChange={toggleChannel}
                      trackColor={{ true: colors.child.grass, false: colors.border }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel="Approve the whole channel"
                    />
                  </View>
                </Animated.View>
              ) : null}
            </ScrollView>

            <Button
              title={
                !checked
                  ? 'Save to review later'
                  : chosen.length > 1
                    ? `Add to ${chosen.length} playlists`
                    : 'Add to playlist'
              }
              variant={checked || !video ? 'primary' : 'outline'}
              loading={saving}
              disabled={!video || chosen.length === 0}
              onPress={() => void add()}
            />
          </Animated.View>
      </View>
      {/* Presented as a modal: dialogs must draw inside it, not behind it. */}
      <AppDialogHost nested />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(27,34,51,.45)' },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  avoiderCentered: { justifyContent: 'center', padding: 40 },
  card: {
    maxWidth: 560,
    borderRadius: 32,
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 32,
    gap: 18,
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.3,
    shadowRadius: 70,
  },
  sheet: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
    paddingHorizontal: 24,
    gap: 16,
    shadowColor: '#1B2233',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
  },
  header: { gap: 16 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: 16 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.dotInactive, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: {
    width: controls.minTouchParent,
    height: controls.minTouchParent,
    borderRadius: controls.minTouchParent / 2,
    backgroundColor: colors.parent.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.child.skyDeep,
  },
  fieldError: { borderColor: colors.red },
  input: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 14.5 * typography.scale,
    color: colors.child.skyDeep,
    paddingVertical: 10,
  },
  inputMono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontWeight: '700',
    fontSize: 14,
  },
  clear: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pasteBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: colors.parent.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { gap: 16 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 96, height: 64, borderRadius: 12, backgroundColor: colors.primaryTint },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  okBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kids: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingLeft: 6,
    paddingRight: 16,
    borderRadius: 22,
    backgroundColor: colors.parent.paper,
  },
  kidOn: { backgroundColor: colors.parent.night, paddingRight: 14 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkRowOn: { backgroundColor: colors.greenTint, borderColor: colors.green },
  checkBox: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.parent.paper,
  },
});

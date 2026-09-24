import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { VideoMeta } from '@littleloop/shared';
import { AppIcon, Appear, PressableScale, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { PANE_BG } from './PaneHost';

function Check({ on }: { on: boolean }) {
  return (
    <View style={[styles.check, { backgroundColor: on ? colors.green : '#D6DEE9' }]}>
      <Svg width={13} height={11} viewBox="0 0 11 9">
        <Path d="M1.5 4.5 L4 7 L9.5 1.5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

/**
 * iPad Playlist, right-hand side: one waiting video, looked at properly before
 * it reaches the child. Replaces the phone's separate Review screen (15).
 */
export function ReviewPane({
  video,
  meta,
  name,
  onApprove,
  onDecline,
  onApproveChannel,
}: {
  video: VideoMeta;
  meta: string;
  name: string;
  onApprove: () => Promise<void>;
  onDecline: () => void;
  /** Absent for uploads from a channel that is already approved. */
  onApproveChannel?: () => Promise<boolean>;
}) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const [channelOn, setChannelOn] = useState(false);

  const approve = async () => {
    setSaving(true);
    try {
      await onApprove();
    } finally {
      setSaving(false);
    }
  };

  const approveChannel = async (next: boolean) => {
    if (!next || !onApproveChannel || channelBusy) return;
    setChannelBusy(true);
    setChannelOn(true);
    const done = await onApproveChannel().catch(() => false);
    setChannelBusy(false);
    setChannelOn(done);
  };

  return (
    <ScrollView
      style={{ backgroundColor: PANE_BG }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Appear index={0}>
        <Txt weight="black" size={26}>Review video</Txt>
      </Appear>
      <Appear index={1} style={styles.thumb}>
        <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Watch ${video.title} before approving`}
          onPress={() => void WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${video.providerVideoId}`)}
          pressedScale={0.95}
          style={styles.watch}
        >
          <Svg width={12} height={15} viewBox="0 0 12 15">
            <Path d="M0 0 L12 7.5 L0 15 Z" fill="#FFFFFF" />
          </Svg>
          <Txt weight="extrabold" size={15} color="#FFFFFF">Watch it first</Txt>
        </PressableScale>
      </Appear>
      <Appear index={2} style={{ gap: 4 }}>
        <Txt weight="black" size={22} lineHeight={27}>{video.title}</Txt>
        <Txt weight="bold" size={14} color={colors.parent.muted}>{meta}</Txt>
      </Appear>
      <Appear index={3}>
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={() => setChecked((on) => !on)}
          haptic={checked ? 'light' : 'medium'}
          pressedScale={0.98}
          style={[styles.card, styles.cardRow, checked && styles.checkedCard]}
        >
          <Check on={checked} />
          <Txt weight="extrabold" size={15} lineHeight={20} color={checked ? colors.greenDark : colors.parent.night} style={{ flex: 1 }}>
            I’ve checked it. It’s OK for {name}.
          </Txt>
        </PressableScale>
      </Appear>
      {onApproveChannel ? (
        <Appear index={4} style={[styles.card, styles.cardRow]}>
          <AppIcon name="channels" size={32} style={{ borderRadius: 10 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Txt weight="extrabold" size={15} color={colors.child.skyDeep}>Approve the whole channel</Txt>
            <Txt weight="bold" size={12.5} color={colors.parent.muted}>New uploads come to you to review first</Txt>
          </View>
          {channelBusy ? (
            <ActivityIndicator color={colors.child.skyDeep} />
          ) : (
            <Switch
              accessibilityLabel={`Approve ${video.channelTitle}'s whole channel`}
              value={channelOn}
              onValueChange={(next) => void approveChannel(next)}
              trackColor={{ true: colors.child.grass, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          )}
        </Appear>
      ) : null}
      <View style={{ flex: 1, minHeight: 16 }} />
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !checked || saving }}
          disabled={!checked || saving}
          onPress={() => void approve()}
          haptic="medium"
          pressedScale={0.97}
          style={[styles.action, styles.approve, !checked && styles.dim]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Txt weight="black" size={18} color="#FFFFFF">✓ Approve for {name}</Txt>}
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={onDecline}
          haptic="light"
          pressedScale={0.97}
          style={[styles.action, styles.decline]}
        >
          <Txt weight="black" size={18} color="#4F4655">Not for {name}</Txt>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 40, gap: 18 },
  thumb: {
    aspectRatio: 16 / 9,
    maxHeight: 340,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 99,
    backgroundColor: 'rgba(42,59,92,.85)',
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 2, borderColor: 'transparent', ...shadows.card },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkedCard: { backgroundColor: colors.greenTint, borderColor: colors.green },
  check: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  approve: { backgroundColor: colors.parent.night, ...shadows.navyButton },
  decline: { backgroundColor: '#EFEAE1' },
  dim: { opacity: 0.5 },
});

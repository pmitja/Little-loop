import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { DAILY_LIMIT_MINUTES, formatDailyLimit } from '@littleloop/shared';
import { Card, ChildAvatar, LockGlyph, ParentHeader, ScreenContainer, showAppAlert, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos } from '@/stores/playlistStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

function showGuidedAccessTips() {
  showAppAlert(
    'Keep your child in LittleLoop',
    Platform.OS === 'ios'
      ? 'Child mode locks LittleLoop, but the Home button/swipe still leaves the app. For a fully locked phone, enable Guided Access:\n\n1. Settings → Accessibility → Guided Access → on\n2. Set a passcode\n3. In LittleLoop, triple-click the side button to start\n\nTriple-click and your passcode end it.'
      : 'Child mode locks LittleLoop, but the Home gesture still leaves the app. For a fully locked phone, use screen pinning:\n\n1. Settings → Security → App pinning → on\n2. Open Recents, tap the LittleLoop icon → Pin\n\nHold Back + Overview to unpin.',
  );
}

/** s12 — child mode entry gate: avatar, counts, Start Child Mode. */
export default function ChildModeGate() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.childProfiles);
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const videos = useLivePlaylistVideos(profile?.id ?? null);
  const limit = profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default;

  const start = () => {
    if (!profile) return;
    if (videos.length === 0) {
      showAppAlert('No videos yet', 'Add at least one approved video before starting child mode.');
      return;
    }
    useAppStore.getState().setActiveChildProfileId(profile.id);
    useTimerStore.getState().startSession(profile.id);
    // Persisted before navigation so an app kill restores into child mode (PLAN §10).
    useLockStore.getState().setChildMode(true);
    router.replace('/(child)');
  };

  return (
    <ScreenContainer scroll style={styles.container}>
      <ParentHeader title="Child Mode" onBack={() => router.back()} />

      <View style={styles.center}>
        <Card radius={28} padding={0} large style={styles.gateCard}>
          {profile ? <ChildAvatar avatar={profile.avatar} size={72} /> : null}
          <Txt weight="black" size={23} style={{ marginTop: 10 }}>
            {profile?.nickname ?? 'No profile'}
          </Txt>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: colors.primaryTint }]}>
              <Txt weight="extrabold" size={12.5} color={colors.primaryDark}>
                {videos.length} approved {videos.length === 1 ? 'video' : 'videos'}
              </Txt>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.amberTint }]}>
              <Txt weight="extrabold" size={12.5} color={colors.amberText}>
                {profile?.dailyLimitMinutes === null ? 'No limit' : `${formatDailyLimit(limit)} limit`}
              </Txt>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={videos.length ? `Hand over to ${profile?.nickname ?? 'child'}` : 'Add an approved video'}
            onPress={videos.length ? start : () => router.push('/(parent)/add-video')}
            style={[shadows.coralButton, { alignSelf: 'stretch' }]}
          >
            <LinearGradient
              colors={colors.coralGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButton}
            >
              <Svg width={14} height={17} viewBox="0 0 14 17">
                <Path d="M1 1 L13 8.5 L1 16 Z" fill="#FFFFFF" />
              </Svg>
              <Txt weight="extrabold" size={17} color="#FFFFFF" numberOfLines={1}>
                {videos.length ? `Hand over to ${profile?.nickname ?? 'child'}` : 'Add an approved video'}
              </Txt>
            </LinearGradient>
          </Pressable>
        </Card>

        {/* The only route to "Who's watching?" now that the Today header chip is
            gone — a second child is otherwise unreachable from the parent zone. */}
        {profiles.length > 1 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a different child" onPress={() => router.push('/whos-watching')} hitSlop={8}>
            <Txt weight="extrabold" size={14} color={colors.primaryDark} center style={{ marginTop: 16 }}>
              Hand over to a different child
            </Txt>
          </Pressable>
        ) : null}

        <View style={styles.pinNote}>
          <LockGlyph color="#B9C2D0" />
          <Txt weight="bold" size={13} color={colors.subtle}>
            Parent PIN required to exit.
          </Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Phone lock setup help" onPress={showGuidedAccessTips} hitSlop={8}>
          <Txt weight="extrabold" size={13} color={colors.primaryDark} center style={{ marginTop: 14 }}>
            {Platform.OS === 'ios' ? 'Tip: lock the whole phone with Guided Access' : 'Tip: lock the whole phone with app pinning'}
          </Txt>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  center: { paddingTop: 34, paddingBottom: 24 },
  gateCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 22 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 20 },
  pill: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  startButton: {
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pinNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
});

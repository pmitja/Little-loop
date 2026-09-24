import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, scaleUi, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos } from '@/stores/playlistStore';
import { Txt } from './Txt';
import { PressableScale } from './Motion';

/** A slow light sweep across the handoff so the one way into child mode catches the eye. */
function Sheen() {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reducedMotion) return;
    x.value = withRepeat(withDelay(3200, withTiming(1, { duration: 1100 })), -1);
  }, [reducedMotion, x]);
  const style = useAnimatedStyle(() => ({ opacity: x.value > -1 && x.value < 1 ? 1 : 0, transform: [{ translateX: x.value * 260 }, { rotate: '18deg' }] }));
  return <Animated.View pointerEvents="none" style={[styles.sheen, style]} />;
}

/**
 * The one way into child mode, pinned above the tab bar on every parent screen.
 *
 * Testers could not find the handoff: it used to be a small chip in the Today
 * header, and the gate screen it leads to was unreachable. Making it persistent
 * means "how do I hand the phone over" never needs an answer.
 */
export function ChildModeBar() {
  const router = useRouter();
  const profile = useAppStore(
    (s) => s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const liveVideos = useLivePlaylistVideos(profile?.id ?? null);
  const ready = liveVideos.length > 0;

  if (!profile) return null;

  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          ready
            ? `Start child mode for ${profile.nickname}`
            : 'Add a video before starting child mode'
        }
        onPress={() => router.push(ready ? '/(parent)/child-mode-gate' : '/(parent)/add-video')}
        haptic="medium"
        pressedScale={0.97}
        style={ready ? shadows.coralButton : null}
      >
        <LinearGradient
          colors={ready ? colors.coralGrad : ['#D8D2C8', '#C9C2B7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bar}
        >
          <Svg width={scaleUi(12)} height={scaleUi(15)} viewBox="0 0 14 17">
            <Path d="M1 1 L13 8.5 L1 16 Z" fill="#FFFFFF" />
          </Svg>
          <Txt weight="extrabold" size={15.5} color="#FFFFFF" style={{ flexShrink: 1 }}>
            {ready ? `Hand over to ${profile.nickname}` : 'Add a video to use Child Mode'}
          </Txt>
          {ready ? <Sheen /> : null}
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: 'transparent' },
  bar: {
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: '45%',
    width: 36,
    backgroundColor: 'rgba(255,255,255,.22)',
  },
});

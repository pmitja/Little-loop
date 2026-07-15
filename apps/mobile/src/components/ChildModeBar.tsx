import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos } from '@/stores/playlistStore';
import { Txt } from './Txt';

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          ready
            ? `Start child mode for ${profile.nickname}`
            : 'Add a video before starting child mode'
        }
        onPress={() => router.push(ready ? '/(parent)/child-mode-gate' : '/(parent)/add-video')}
        style={({ pressed }) => [shadows.coralButton, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={ready ? colors.coralGrad : ['#D8D2C8', '#C9C2B7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bar}
        >
          <Svg width={12} height={15} viewBox="0 0 14 17">
            <Path d="M1 1 L13 8.5 L1 16 Z" fill="#FFFFFF" />
          </Svg>
          <Txt weight="extrabold" size={15.5} color="#FFFFFF">
            {ready ? `Hand over to ${profile.nickname}` : 'Add a video to use Child Mode'}
          </Txt>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: 'transparent' },
  bar: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});

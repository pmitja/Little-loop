import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, ChildAvatar, Float, LockGlyph, NoVideosModal, PressableScale, Twinkle, Txt } from '@/components';
import { KID_TINTS } from '@/theme/kid';
import { FREE_LIMITS } from '@littleloop/shared';
import { colors, controls, exactType } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

export default function WhosWatching() {
  const router = useRouter();
  const { isTablet } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const profiles = useAppStore((s) => s.childProfiles);
  const premium = usePremium();
  const childModeActive = useLockStore((state) => state.childMode.active);
  const [noVideosChildId, setNoVideosChildId] = useState<string | null>(null);
  const noVideosChild = profiles.find((candidate) => candidate.id === noVideosChildId);

  const start = (id: string) => {
    const live =
      usePlaylistStore
        .getState()
        .videosByChild[id]?.filter((video) => (video.status ?? 'live') === 'live') ?? [];
    const profile = profiles.find((candidate) => candidate.id === id);

    if (!profile || !live.length) {
      setNoVideosChildId(id);
      return;
    }

    useAppStore.getState().setActiveChildProfileId(id);
    useTimerStore.getState().startSession(id);
    useLockStore.getState().setChildMode(true);
    router.replace('/(child)');
  };

  const add = () => {
    if (!premium && profiles.length >= FREE_LIMITS.childProfiles) {
      router.push({ pathname: '/paywall', params: { trigger: 'profile-cap' } });
      return;
    }
    if (childModeActive && profiles.length) {
      router.push({ pathname: '/pin-unlock', params: { next: '/(parent)/add-child' } });
      return;
    }
    router.push(profiles.length ? '/(parent)/add-child' : '/(onboarding)/child-profile');
  };

  const addVideo = () => {
    if (noVideosChildId) {
      useAppStore.getState().setActiveChildProfileId(noVideosChildId);
    }
    setNoVideosChildId(null);
    router.push({ pathname: '/pin-unlock', params: { next: '/(parent)/add-video' } });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        pointerEvents="none"
        colors={['#8E71D6', colors.child.plum, '#5E43A0']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Twinkle size={6} delay={0} style={{ top: insets.top + 90, left: 48 }} />
      <Twinkle size={4} delay={500} style={{ top: insets.top + 150, right: 64 }} />
      <Twinkle size={5} delay={900} style={{ top: insets.top + 230, left: 96 }} />
      <Twinkle size={3} delay={1300} style={{ top: insets.top + 70, right: 128 }} />

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Open grown-up controls"
        hitSlop={8}
        onPress={() =>
          router.push({ pathname: '/pin-unlock', params: { next: '/(parent)/(tabs)' } })
        }
        style={[styles.grown, { top: insets.top + 10 }]}
      >
        <LockGlyph color="#FFFFFF" scale={0.72} />
        <Txt weight="extrabold" size={13} color="#FFFFFF">
          Grown-ups
        </Txt>
      </PressableScale>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 110, paddingBottom: insets.bottom + 36 },
        ]}
      >
        <Appear index={0}>
          <Txt weight="black" size={isTablet ? exactType(46) : 32} color="#FFFFFF" center>
            Who’s watching?
          </Txt>
        </Appear>

        <View style={[styles.profileGrid, isTablet && styles.profileGridBig]}>
          {profiles.map((profile, i) => (
            <Appear key={profile.id} index={i + 1}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Start Child Mode for ${profile.nickname}`}
                onPress={() => start(profile.id)}
                haptic="medium"
                pressedScale={0.92}
                style={styles.kid}
              >
                <View style={[styles.face, isTablet && styles.faceBig, { backgroundColor: KID_TINTS[profile.avatar] ?? KID_TINTS.fox }]}>
                  <Float distance={5} sway={3} duration={2000} phase={i * 450}>
                    <ChildAvatar avatar={profile.avatar} size={isTablet ? 148 : 112} />
                  </Float>
                </View>
                <Txt weight="black" size={isTablet ? exactType(30) : 22} color="#FFFFFF" numberOfLines={1}>
                  {profile.nickname}
                </Txt>
              </PressableScale>
            </Appear>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        {!childModeActive ? (
          <Appear index={profiles.length + 1}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Add a child profile"
              onPress={add}
              style={styles.addRow}
            >
              <View style={styles.add}>
                <Txt weight="black" size={28} color="#FFFFFF">
                  +
                </Txt>
              </View>
              <View style={{ gap: 1 }}>
                <Txt weight="extrabold" size={15} color="#FFFFFF">
                  Add a child
                </Txt>
                <Txt weight="bold" size={12} color="rgba(255,255,255,.8)">
                  Needs the grown-up PIN
                </Txt>
              </View>
            </PressableScale>
          </Appear>
        ) : null}
      </ScrollView>

      <NoVideosModal
        visible={noVideosChildId !== null}
        childName={noVideosChild?.nickname}
        onAddVideo={addVideo}
        onDismiss={() => setNoVideosChildId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.plum },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 44,
  },
  grown: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    minHeight: controls.minTouchParent,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 26,
    rowGap: 30,
  },
  kid: {
    alignItems: 'center',
    gap: 14,
  },
  // iPad (design 05): bigger faces, spread wider apart.
  profileGridBig: { maxWidth: 880, columnGap: 56, rowGap: 40 },
  faceBig: { width: 200, height: 200, borderRadius: 100, borderWidth: 8 },
  face: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E0F46',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    elevation: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 20,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,.5)',
  },
  add: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildAvatar, LockGlyph, NoVideosModal, Txt } from '@/components';
import { FREE_LIMITS } from '@littleloop/shared';
import { colors, controls } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

export default function WhosWatching() {
  const router = useRouter();
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
      <StatusBar style="dark" />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.child.sky, '#7FD4E8']}
        style={[styles.headerBackdrop, { height: insets.top + 260 }]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open grown-up controls"
        hitSlop={8}
        onPress={() =>
          router.push({ pathname: '/pin-unlock', params: { next: '/(parent)/(tabs)' } })
        }
        style={({ pressed }) => [
          styles.grown,
          { top: insets.top + 12 },
          pressed && styles.pressed,
        ]}
      >
        <LockGlyph color={colors.parent.night} scale={0.72} />
        <Txt weight="bold" size={12} color={colors.parent.night}>
          Grown-ups
        </Txt>
      </Pressable>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 86, paddingBottom: insets.bottom + 36 },
        ]}
      >
        <View style={styles.heading}>
          <Txt
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            size={15}
            color={colors.child.skyDeep}
            style={styles.stars}
          >
            ✦ ✧ ✦
          </Txt>
          <Txt weight="black" size={28} color={colors.parent.night} center>
            Who’s watching?
          </Txt>
        </View>

        <View style={styles.profileGrid}>
          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Start Child Mode for ${profile.nickname}`}
              onPress={() => start(profile.id)}
              style={({ pressed }) => [styles.kid, pressed && styles.pressed]}
            >
              <View style={styles.face}>
                <ChildAvatar avatar={profile.avatar} size={92} />
              </View>
              <Txt weight="black" size={15} color={colors.parent.night} numberOfLines={1}>
                {profile.nickname}
              </Txt>
            </Pressable>
          ))}
        </View>

        {!childModeActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a child profile"
            onPress={add}
            style={({ pressed }) => [styles.kid, styles.addKid, pressed && styles.pressed]}
          >
            <View style={styles.add}>
              <Txt size={30} color={colors.parent.night}>
                ＋
              </Txt>
            </View>
            <Txt weight="black" size={14} color={colors.parent.night}>
              Add a child
            </Txt>
          </Pressable>
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
  root: { flex: 1, backgroundColor: colors.child.cream },
  headerBackdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 30,
  },
  grown: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    minHeight: controls.minTouchParent,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heading: { alignItems: 'center', gap: 12 },
  stars: { letterSpacing: 8, marginLeft: 8 },
  profileGrid: {
    width: 236,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 22,
  },
  kid: {
    width: 96,
    minHeight: controls.minTouchChild,
    alignItems: 'center',
    gap: 8,
  },
  face: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addKid: { marginTop: 2 },
  add: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.parent.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72 },
});

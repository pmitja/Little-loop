import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { FREE_LIMITS, type ChildProfile } from '@littleloop/shared';
import { Logo } from '@/components/Logo';
import { Card, ChildAvatar, ScreenContainer, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

function PlayTriangle() {
  return (
    <Svg width={11} height={13} viewBox="0 0 11 13">
      <Path d="M1 1 L10 6.5 L1 12 Z" fill="#FFFFFF" />
    </Svg>
  );
}

function ParentButton({ onPress, note }: { onPress: () => void; note: string }) {
  return (
    <>
      <Pressable onPress={onPress} style={styles.parentButton}>
        <Svg width={17} height={19} viewBox="0 0 17 19">
          <Path
            d="M5 8 V5.5 a3.5 3.5 0 0 1 7 0 V8"
            stroke={colors.muted}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M2 8 h13 a1.5 1.5 0 0 1 1.5 1.5 v6 a1.5 1.5 0 0 1 -1.5 1.5 h-13 a1.5 1.5 0 0 1 -1.5 -1.5 v-6 a1.5 1.5 0 0 1 1.5 -1.5 Z"
            fill={colors.muted}
          />
        </Svg>
        <Txt weight="extrabold" size={15}>
          I’m a parent
        </Txt>
      </Pressable>
      <Txt weight="semibold" size={12} color={colors.subtle} style={{ marginTop: 10 }}>
        {note}
      </Txt>
    </>
  );
}

function ProfileCard({ profile, onPress }: { profile: ChildProfile; onPress: () => void }) {
  const count = usePlaylistStore((s) => (s.videosByChild[profile.id] ?? []).length);
  return (
    <Card radius={26} padding={0} style={styles.profileCard}>
      <ChildAvatar avatar={profile.avatar} size={76} />
      <Txt weight="black" size={18}>
        {profile.nickname}
      </Txt>
      <View style={styles.countPill}>
        <Txt weight="extrabold" size={11.5} color={colors.primaryDark}>
          {count} {count === 1 ? 'video' : 'videos'}
        </Txt>
      </View>
      <Pressable onPress={onPress} style={[shadows.coralButton, { alignSelf: 'stretch' }]}>
        <LinearGradient
          colors={colors.coralGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.watchButton}
        >
          <PlayTriangle />
          <Txt weight="extrabold" size={13.5} color="#FFFFFF">
            Watch
          </Txt>
        </LinearGradient>
      </Pressable>
    </Card>
  );
}

/** s21b — empty state: no profiles yet (first launch after PIN, or all removed). */
function NoChildrenYet({ onAdd }: { onAdd: () => void }) {
  return (
    <>
      <Txt weight="black" size={27}>
        Welcome to LittleLoop
      </Txt>
      <Txt weight="semibold" size={14} color={colors.muted} style={{ marginTop: 6 }}>
        Set up a profile for your child to begin
      </Txt>
      <View style={styles.emptyCenter}>
        <Card radius={28} large style={styles.emptyCard}>
          <View style={styles.emptyAvatarRow}>
            <View style={{ opacity: 0.45 }}>
              <View style={styles.ghostAvatar} />
            </View>
            <View style={styles.dashedAvatar}>
              <View style={styles.plusBubbleLg}>
                <Txt weight="extrabold" size={20} color={colors.primary}>
                  +
                </Txt>
              </View>
            </View>
            <View style={{ opacity: 0.45 }}>
              <View style={styles.ghostAvatar} />
            </View>
          </View>
          <Txt weight="black" size={21} center>
            Add your first child
          </Txt>
          <Txt
            weight="semibold"
            size={14}
            color={colors.muted}
            center
            lineHeight={21.7}
            style={{ marginTop: 10, marginBottom: 24 }}
          >
            Just a nickname and an avatar — no personal data. Then build their playlist of approved
            videos.
          </Txt>
          <Pressable onPress={onAdd} style={[shadows.primaryButton, { alignSelf: 'stretch' }]}>
            <View style={styles.addFirstButton}>
              <Txt weight="extrabold" size={16} color="#FFFFFF">
                Add a Child
              </Txt>
            </View>
          </Pressable>
        </Card>
      </View>
    </>
  );
}

/** s21 / s21b — start screen: pick a profile for Child Mode, or unlock parent mode. */
export default function WhosWatching() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.childProfiles);
  const premium = usePremium();

  const startChildMode = (profile: ChildProfile) => {
    const videos = usePlaylistStore.getState().videosByChild[profile.id] ?? [];
    if (videos.length === 0) {
      Alert.alert(
        'No videos yet',
        `Add at least one approved video to ${profile.nickname}’s playlist first (parents only).`,
      );
      return;
    }
    useAppStore.getState().setActiveChildProfileId(profile.id);
    useTimerStore.getState().startSession(profile.id);
    // Persisted before navigation so an app kill restores into child mode (PLAN §10).
    useLockStore.getState().setChildMode(true);
    router.replace('/(child)');
  };

  const addChild = () => {
    if (profiles.length === 0) {
      // First profile is free — plain onboarding creation (s06).
      router.push('/(onboarding)/child-profile');
    } else if (!premium && profiles.length >= FREE_LIMITS.childProfiles) {
      router.push('/paywall');
    } else {
      router.push('/(parent)/add-child');
    }
  };

  const openParentMode = () =>
    router.push({ pathname: '/pin-unlock', params: { next: '/(parent)/(tabs)' } });

  return (
    <ScreenContainer scroll style={styles.container}>
      <Logo size={56} />
      <View style={{ height: 18 }} />

      {profiles.length === 0 ? (
        <NoChildrenYet onAdd={addChild} />
      ) : (
        <>
          <Txt weight="black" size={27}>
            Who’s watching?
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} style={{ marginTop: 6, marginBottom: 26 }}>
            Pick a profile to start Child Mode
          </Txt>
          <View style={styles.grid}>
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onPress={() => startChildMode(profile)}
              />
            ))}
          </View>
          <Pressable onPress={addChild} style={styles.addRow}>
            <View style={styles.plusBubble}>
              <Txt weight="extrabold" size={16} color={colors.primary}>
                +
              </Txt>
            </View>
            <Txt weight="extrabold" size={14} color={colors.primary}>
              Add a child
            </Txt>
          </Pressable>
        </>
      )}

      <View style={{ flexGrow: 1, minHeight: 28 }} />
      <ParentButton
        onPress={openParentMode}
        note={profiles.length === 0 ? 'Settings & playlists live behind the PIN' : 'Parent PIN required'}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 48, flexGrow: 1, alignItems: 'center' },
  grid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  profileCard: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  countPill: {
    backgroundColor: colors.primaryTint,
    borderRadius: 11,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  watchButton: {
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addRow: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 22,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: '#BFD9F4',
    backgroundColor: '#F6FAFF',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  plusBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCenter: { alignSelf: 'stretch', flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  emptyCard: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 28 },
  emptyAvatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  ghostAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0F2F6' },
  dashedAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: '#BFD9F4',
    backgroundColor: '#F6FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -6,
    zIndex: 1,
  },
  plusBubbleLg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFirstButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.card,
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 26,
    ...shadows.card,
  },
});

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { DAILY_LIMIT_MINUTES } from '@littleloop/shared';
import { Card, ChildAvatar, PlusIcon, ScreenContainer, Txt } from '@/components';
import { colors, radii } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistVideos } from '@/stores/playlistStore';
import { useSecondsWatchedToday } from '@/stores/timerStore';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function ListGlyph() {
  return (
    <View style={{ gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
      ))}
    </View>
  );
}

function ClockGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={8} stroke="#E8A93D" strokeWidth={2.5} fill="none" />
      <Path d="M10 6 V10 L13 12" stroke="#E8A93D" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function BarsGlyph() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      <View style={{ width: 5, height: 9, borderRadius: 2, backgroundColor: colors.green }} />
      <View style={{ width: 5, height: 16, borderRadius: 2, backgroundColor: colors.green }} />
      <View style={{ width: 5, height: 12, borderRadius: 2, backgroundColor: colors.green }} />
    </View>
  );
}

interface ActionTileProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function ActionTile({ icon, iconBg, title, subtitle, onPress }: ActionTileProps) {
  return (
    <Pressable onPress={onPress} style={styles.tileWrap}>
      <Card radius={22} padding={16} style={styles.tile}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <Txt weight="extrabold" size={15}>
          {title}
        </Txt>
        <Txt weight="semibold" size={12} color={colors.subtle} style={{ marginTop: 2 }}>
          {subtitle}
        </Txt>
      </Card>
    </Pressable>
  );
}

/** s10 — parent dashboard: greeting, stats card, action grid, Start Child Mode. */
export default function Dashboard() {
  const router = useRouter();
  const childProfiles = useAppStore((s) => s.childProfiles);
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const canSwitchChild = childProfiles.length > 1;
  const switchToNextChild = () => {
    if (!profile || !canSwitchChild) return;
    const idx = childProfiles.findIndex((p) => p.id === profile.id);
    const next = childProfiles[(idx + 1) % childProfiles.length];
    useAppStore.getState().setActiveChildProfileId(next.id);
  };
  const videos = usePlaylistVideos(profile?.id ?? null);
  const name = profile?.nickname ?? 'your child';
  const limit = profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default;
  const secondsWatched = useSecondsWatchedToday(profile?.id ?? null);
  const minutesWatchedToday = Math.floor(secondsWatched / 60);
  const unlimited = profile?.dailyLimitMinutes === null;
  const minutesLeft = Math.max(0, limit - minutesWatchedToday);

  return (
    <ScreenContainer scroll style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Txt weight="semibold" size={14} color={colors.muted}>
            {greeting()}
          </Txt>
          <Txt weight="black" size={26}>
            Your family
          </Txt>
        </View>
        {profile ? (
          <Pressable onPress={switchToNextChild} disabled={!canSwitchChild}>
            <Card radius={22} padding={6} style={styles.childChip}>
              <ChildAvatar avatar={profile.avatar} size={30} />
              <Txt weight="extrabold" size={14} style={{ marginRight: canSwitchChild ? 0 : 6 }}>
                {profile.nickname}
              </Txt>
              {canSwitchChild ? (
                <Svg width={12} height={8} viewBox="0 0 12 8" style={{ marginRight: 6 }}>
                  <Path
                    d="M1.5 1.5 L6 6 L10.5 1.5"
                    stroke={colors.muted}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              ) : null}
            </Card>
          </Pressable>
        ) : null}
      </View>

      <Card radius={radii.cardLg} padding={20} large style={{ marginTop: 18 }}>
        <View style={styles.statsRow}>
          <Txt weight="extrabold" size={16} style={{ flex: 1 }}>
            {profile
              ? `${profile.nickname} has ${videos.length} approved ${videos.length === 1 ? 'video' : 'videos'}`
              : 'No child profile yet'}
          </Txt>
          <View style={styles.checkCircle}>
            <Svg width={10} height={8} viewBox="0 0 10 8">
              <Path
                d="M1 4 L3.5 6.5 L9 1"
                stroke={colors.green}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        </View>
        <View style={styles.limitRow}>
          <View style={styles.track}>
            <LinearGradient
              colors={[colors.green, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: `${Math.min(100, Math.round((minutesWatchedToday / limit) * 100))}%`,
                height: '100%',
                borderRadius: 4,
              }}
            />
          </View>
          <Txt weight="extrabold" size={13} color={colors.muted}>
            {unlimited ? `${minutesWatchedToday} min today` : `${minutesLeft} min left today`}
          </Txt>
        </View>
      </Card>

      <View style={styles.grid}>
        <ActionTile
          icon={<ListGlyph />}
          iconBg={colors.primaryTint}
          title="Manage Playlist"
          subtitle={`${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`}
          onPress={() => router.navigate('/(parent)/(tabs)/playlist')}
        />
        <ActionTile
          icon={<PlusIcon color={colors.primary} size={20} />}
          iconBg={colors.primaryTint}
          title="Add Video"
          subtitle="Paste a link"
          onPress={() => router.push('/(parent)/add-video')}
        />

        <Pressable
          style={styles.childModeWrap}
          onPress={() => router.push('/(parent)/child-mode-gate')}
        >
          <LinearGradient
            colors={colors.coralGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.childModeCard}
          >
            <View style={styles.playCircle}>
              <Svg width={18} height={20} viewBox="0 0 18 20">
                <Path d="M2 1 L17 10 L2 19 Z" fill="#FFFFFF" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="black" size={17} color="#FFFFFF">
                Start Child Mode
              </Txt>
              <Txt weight="semibold" size={12.5} color="rgba(255,255,255,.85)">
                Hand the phone to {name} safely
              </Txt>
            </View>
            <Svg width={10} height={16} viewBox="0 0 10 16">
              <Path
                d="M2 2 L8 8 L2 14"
                stroke="rgba(255,255,255,.9)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </LinearGradient>
        </Pressable>

        <ActionTile
          icon={<ClockGlyph />}
          iconBg={colors.amberTint}
          title="Time Limits"
          subtitle={unlimited ? 'No daily limit' : `${limit} min daily`}
          onPress={() => router.push('/(parent)/time-limit')}
        />
        <ActionTile
          icon={<BarsGlyph />}
          iconBg={colors.greenTint}
          title="Activity"
          subtitle={`${minutesWatchedToday} min today`}
          onPress={() => router.navigate('/(parent)/(tabs)/activity')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  tileWrap: { flexBasis: '47%', flexGrow: 1 },
  tile: { minHeight: 118 },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  childModeWrap: {
    flexBasis: '100%',
    shadowColor: colors.coral,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  childModeCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
});

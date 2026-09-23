import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildAvatar, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import type { AvatarId } from '@littleloop/shared';
import { useKidPullToRefresh } from './useKidPullToRefresh';

interface KidWaitingScreenProps {
  nickname?: string;
  avatar?: AvatarId;
  reason: 'no-videos' | 'ask-grown-up';
}

/**
 * Shown on a child's own device when there is nothing to play yet. No buttons:
 * everything that fixes it happens on the grown-up's phone, and the next sync
 * (or a pull-to-refresh) swaps this screen for the videos on its own.
 */
export function KidWaitingScreen({ nickname, avatar, reason }: KidWaitingScreenProps) {
  const insets = useSafeAreaInsets();
  const pullToRefresh = useKidPullToRefresh();
  const name = nickname ?? 'friend';
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.child.sky, '#7FD4E8', colors.child.cream]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        refreshControl={
          pullToRefresh ? (
            <RefreshControl
              refreshing={pullToRefresh.refreshing}
              onRefresh={pullToRefresh.onRefresh}
              tintColor={colors.parent.night}
              colors={[colors.primaryDark]}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.glow}>
          <ChildAvatar avatar={avatar ?? 'star'} size={104} />
        </View>
        <Txt weight="black" size={28} color={colors.parent.night} center style={styles.title}>
          Hi, {name}!
        </Txt>
        <Txt weight="bold" size={16} color={colors.parent.night} center style={styles.body}>
          {reason === 'no-videos'
            ? 'Your grown-up is picking videos for you. They will show up here soon.'
            : 'Ask a grown-up to open LittleLoop on their phone.'}
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.child.cream },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  glow: { padding: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.45)' },
  title: { maxWidth: 320 },
  body: { maxWidth: 300, lineHeight: 24 },
});

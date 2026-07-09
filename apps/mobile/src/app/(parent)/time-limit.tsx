import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';

const OPTIONS: { label: string; minutes: number | null }[] = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: 'No daily limit', minutes: null },
];

/** Settings → Time limits: pick the child's daily watch limit (feeds the Phase 3 timer). */
export default function TimeLimit() {
  const router = useRouter();
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );

  return (
    <ScreenContainer style={styles.container}>
      <ParentHeader
        title="Time limits"
        subtitle={profile ? `Daily watch time for ${profile.nickname}` : undefined}
        onBack={() => router.back()}
      />
      <View style={styles.group}>
        {OPTIONS.map((opt, i) => {
          const selected = profile ? profile.dailyLimitMinutes === opt.minutes : false;
          return (
            <Pressable
              key={opt.label}
              disabled={!profile}
              onPress={() => {
                if (!profile) return;
                useAppStore.getState().updateChildProfile(profile.id, {
                  dailyLimitMinutes: opt.minutes,
                });
                router.back();
              }}
              style={[styles.row, i > 0 ? styles.rowBorder : null]}
            >
              <Txt weight="bold" size={14.5} style={{ flex: 1 }}>
                {opt.label}
              </Txt>
              {selected ? (
                <Svg width={16} height={13} viewBox="0 0 16 13">
                  <Path
                    d="M1.5 6.5 L6 11 L14.5 1.5"
                    stroke={colors.primary}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Txt weight="semibold" size={12.5} color={colors.subtle} style={{ marginTop: 14, paddingHorizontal: 4 }} lineHeight={19}>
        When the time is up, playback pauses and your child sees a gentle “time for a break”
        screen. Changes apply the next time the timer ticks.
      </Txt>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  group: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginTop: 18,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F2F6' },
});

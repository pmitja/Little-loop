import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ChildSwitcher, OptionList, OwlBubble, ParentHeader, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, Txt } from '@/components';
import { DEFAULT_CHILD_RULES, useAppStore } from '@/stores/appStore';
import { colors, controls, radii, shadows } from '@/theme/tokens';

const options = [{ value: 20, nickname: 'Short & sweet' }, { value: 45, nickname: 'Just right' }, { value: 60, nickname: 'Movie day' }, { value: 90, nickname: 'Rainy Sunday' }];

function bedtimeMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return 19 * 60 + 30;
  const hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  return hour * 60 + minute + (match[3] === 'PM' ? 12 * 60 : 0);
}

function bedtimeLabel(minutes: number): string {
  const normalized = (minutes + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

export default function TimeLimit() {
  const router = useRouter();
  const profiles = useAppStore(s => s.childProfiles);
  const profile = useAppStore(s => s.childProfiles.find(p => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null);
  const rules = useAppStore(s => profile ? s.childRules[profile.id] ?? DEFAULT_CHILD_RULES : DEFAULT_CHILD_RULES);
  const update = (patch: Partial<typeof rules>) => { if (profile) useAppStore.getState().updateChildRules(profile.id, patch); };
  const adjustBedtime = (change: number) => update({ bedtime: bedtimeLabel(bedtimeMinutes(rules.bedtime) + change) });

  return <ScreenContainer scroll style={styles.root}>
    <ParentHeader title="Time limits" onBack={() => router.back()} />
    {profiles.length > 1 ? <>
      <SectionLabel>Choose a child</SectionLabel>
      <ChildSwitcher profiles={profiles} activeId={profile?.id ?? null} onSelect={id => useAppStore.getState().setActiveChildProfileId(id)} />
    </> : null}
    <OwlBubble>Set a daily limit and bedtime just for {profile?.nickname ?? 'your child'}.</OwlBubble>
    <SectionLabel>Daily limit</SectionLabel>
    <OptionList options={options} selected={profile?.dailyLimitMinutes ?? null} onSelect={value => { if (profile) useAppStore.getState().updateChildProfile(profile.id, { dailyLimitMinutes: value }); }} />
    <SectionLabel>Bedtime</SectionLabel>
    <View style={styles.bedtimeCard}>
      <View style={styles.bedtimeHeader}>
        <View style={styles.bedtimeCopy}>
          <Txt weight="extrabold" size={16}>Bedtime cut-off</Txt>
          <Txt size={13} color={colors.parent.muted}>Stop videos after this time</Txt>
        </View>
        <Switch value={rules.bedtimeEnabled} onValueChange={value => update({ bedtimeEnabled: value })} trackColor={{ true: colors.child.grass, false: colors.border }} thumbColor="#FFFFFF" />
      </View>
      <View style={[styles.timeAdjuster, !rules.bedtimeEnabled && styles.disabled]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Set bedtime 30 minutes earlier" disabled={!rules.bedtimeEnabled} onPress={() => adjustBedtime(-30)} style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}>
          <Txt weight="black" size={24} color={colors.child.skyDeep}>−</Txt>
        </Pressable>
        <View accessibilityRole="text" accessibilityLabel={`Bedtime ${rules.bedtime}`} style={styles.timeValue}>
          <Txt weight="black" size={24} color={colors.parent.night}>{rules.bedtime}</Txt>
          <Txt size={12} color={colors.parent.muted}>30-minute steps</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Set bedtime 30 minutes later" disabled={!rules.bedtimeEnabled} onPress={() => adjustBedtime(30)} style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}>
          <Txt weight="black" size={24} color={colors.child.skyDeep}>＋</Txt>
        </Pressable>
      </View>
    </View>
    <SectionLabel>Extra care</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon="☀" iconBg="#FFF3D9" title="Weekends" value="+30 extra min" toggle={{ value: rules.weekendBonus, onChange: value => update({ weekendBonus: value }) }} />
      <SettingsRow icon="⌛" iconBg="#EAFBF0" title="5-minute warning" value="Gentle heads-up" toggle={{ value: rules.warningEnabled, onChange: value => update({ warningEnabled: value }) }} />
    </SettingsGroup>
    <Button title={`Save for ${profile?.nickname ?? 'child'}`} onPress={() => router.back()} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 18 },
  bedtimeCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: 16, gap: 18, ...shadows.card },
  bedtimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bedtimeCopy: { flex: 1, gap: 2 },
  timeAdjuster: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeButton: { width: controls.minTouchParent, height: controls.minTouchParent, borderRadius: controls.minTouchParent / 2, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  timeValue: { flex: 1, alignItems: 'center', gap: 2 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.45 },
});

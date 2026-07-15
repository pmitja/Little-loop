import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDailyLimit } from '@littleloop/shared';
import { AppIcon, Button, ChildSwitcher, DailyLimitOptions, OwlBubble, ParentHeader, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, showAppAlert, Txt } from '@/components';
import { updateChildProfile } from '@/features/family/updateChildProfile';
import { updateSharedChildRules } from '@/features/family/updateChildRules';
import { formatBedtime, parseBedtime } from '@/lib/bedtime';
import { DEFAULT_CHILD_RULES, useAppStore } from '@/stores/appStore';
import { colors, controls, radii, shadows } from '@/theme/tokens';

export default function TimeLimit() {
  const router = useRouter();
  const profiles = useAppStore(s => s.childProfiles);
  const profile = useAppStore(s => s.childProfiles.find(p => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null);
  const rules = useAppStore(s => profile ? s.childRules[profile.id] ?? DEFAULT_CHILD_RULES : DEFAULT_CHILD_RULES);
  const update = (patch: Partial<typeof rules>) => {
    if (profile) void updateSharedChildRules(profile.id, patch);
  };
  const adjustBedtime = (change: number) => update({ bedtime: formatBedtime(parseBedtime(rules.bedtime) + change) });

  const limit = profile?.dailyLimitMinutes ?? null;

  const saveLimit = async (dailyLimitMinutes: number) => {
    if (!profile) return;
    const saved = await updateChildProfile(profile.id, { dailyLimitMinutes });
    if (!saved) {
      showAppAlert(
        'Saved on this device only',
        `${profile.nickname}’s limit is ${formatDailyLimit(dailyLimitMinutes)} here, but we couldn’t reach your account. Open this screen again while online to save it for good.`,
      );
    }
  };

  return <ScreenContainer scroll style={styles.root}>
    <ParentHeader title="Time limits" onBack={() => router.back()} />
    {profiles.length > 1 ? <>
      <SectionLabel>Choose a child</SectionLabel>
      <ChildSwitcher profiles={profiles} activeId={profile?.id ?? null} onSelect={id => useAppStore.getState().setActiveChildProfileId(id)} />
    </> : null}
    <OwlBubble>Set a daily limit and bedtime just for {profile?.nickname ?? 'your child'}.</OwlBubble>
    <SectionLabel>Daily limit</SectionLabel>
    <DailyLimitOptions value={limit} onChange={(minutes) => { void saveLimit(minutes); }} />
    <SectionLabel>Bedtime</SectionLabel>
    <View style={styles.bedtimeCard}>
      <View style={styles.bedtimeHeader}>
        <View style={styles.bedtimeCopy}>
          <Txt weight="extrabold" size={16}>Bedtime cut-off</Txt>
          <Txt size={13} color={colors.parent.muted}>Stop videos from this time until 6:00 AM</Txt>
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
      <SettingsRow icon={<AppIcon name="weekend" />} iconBg="transparent" title="Weekends" value="+30 extra min" toggle={{ value: rules.weekendBonus, onChange: value => update({ weekendBonus: value }) }} />
      <SettingsRow icon={<AppIcon name="warning" />} iconBg="transparent" title="5-minute warning" value="Gentle heads-up" toggle={{ value: rules.warningEnabled, onChange: value => update({ warningEnabled: value }) }} />
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

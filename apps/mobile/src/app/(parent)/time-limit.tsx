import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDailyLimit } from '@littleloop/shared';
import { AppIcon, Appear, Button, ChildSwitcher, DailyLimitOptions, OwlBubble, ParentHeader, PressableScale, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, showAppAlert, Txt } from '@/components';
import { updateChildProfile } from '@/features/family/updateChildProfile';
import { updateSharedChildRules } from '@/features/family/updateChildRules';
import { formatBedtime, parseBedtime } from '@/lib/bedtime';
import { SCHOOL_STEP, shiftSchoolWindow } from '@/lib/schoolTime';
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
  const adjustSchool = (edge: 'start' | 'end', change: number) => update(shiftSchoolWindow(rules, edge, change));
  const school = shiftSchoolWindow(rules, 'start', 0);

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
    <Appear index={0}><ParentHeader title="Daily time" onBack={() => router.back()} /></Appear>
    {profiles.length > 1 ? <Appear index={1}>
      <ChildSwitcher profiles={profiles} activeId={profile?.id ?? null} onSelect={id => useAppStore.getState().setActiveChildProfileId(id)} />
    </Appear> : null}
    <Appear index={2}><OwlBubble avatar={profile?.avatar ?? 'fox'}>How long can {profile?.nickname ?? 'your child'} watch each day?</OwlBubble></Appear>
    <Appear index={3}><DailyLimitOptions value={limit} onChange={(minutes) => { void saveLimit(minutes); }} /></Appear>
    <Appear index={4} style={styles.section}>
    <SectionLabel>Bedtime</SectionLabel>
    <View style={styles.bedtimeCard}>
      <View style={styles.bedtimeHeader}>
        <View style={styles.bedtimeCopy}>
          <Txt weight="extrabold" size={16}>Bedtime cut-off</Txt>
          <Txt size={13} color={colors.parent.muted}>Stop videos from this time until 6:00 AM</Txt>
        </View>
        <Switch value={rules.bedtimeEnabled} onValueChange={value => update({ bedtimeEnabled: value })} trackColor={{ true: colors.child.grass, false: colors.border }} thumbColor="#FFFFFF" />
      </View>
      <TimeStepper label="Bedtime" value={rules.bedtime} hint="30-minute steps" step={30} disabled={!rules.bedtimeEnabled} onChange={adjustBedtime} />
    </View>
    </Appear>
    <Appear index={5} style={styles.section}>
    <SectionLabel>School hours</SectionLabel>
    <View style={styles.bedtimeCard}>
      <View style={styles.bedtimeHeader}>
        <AppIcon name="school" size={40} />
        <View style={styles.bedtimeCopy}>
          <Txt weight="extrabold" size={16}>No videos at school time</Txt>
          <Txt size={13} color={colors.parent.muted}>Monday to Friday, videos rest between these times</Txt>
        </View>
        <Switch value={rules.schoolTimeEnabled} onValueChange={value => update({ schoolTimeEnabled: value })} trackColor={{ true: colors.child.grass, false: colors.border }} thumbColor="#FFFFFF" />
      </View>
      <TimeStepper label="School starts" value={school.schoolStart} hint="Starts" step={SCHOOL_STEP} disabled={!rules.schoolTimeEnabled} onChange={change => adjustSchool('start', change)} />
      <TimeStepper label="School ends" value={school.schoolEnd} hint="Ends" step={SCHOOL_STEP} disabled={!rules.schoolTimeEnabled} onChange={change => adjustSchool('end', change)} />
    </View>
    </Appear>
    <Appear index={6} style={styles.section}>
    <SectionLabel>Extra care</SectionLabel>
    <SettingsGroup>
      <SettingsRow icon={<AppIcon name="weekend" />} iconBg="transparent" title="Weekends" value="+30 extra min" toggle={{ value: rules.weekendBonus, onChange: value => update({ weekendBonus: value }) }} />
      <SettingsRow icon={<AppIcon name="warning" />} iconBg="transparent" title="5-minute warning" value="Gentle heads-up" toggle={{ value: rules.warningEnabled, onChange: value => update({ warningEnabled: value }) }} />
    </SettingsGroup>
    </Appear>
    <Button title={`Save for ${profile?.nickname ?? 'child'}`} onPress={() => router.back()} />
  </ScreenContainer>;
}

/** − value ＋ in fixed steps; the value line doubles as its accessible label. */
function TimeStepper({ label, value, hint, step, disabled, onChange }: {
  label: string;
  value: string;
  hint: string;
  step: number;
  disabled: boolean;
  onChange: (change: number) => void;
}) {
  return <View style={[styles.timeAdjuster, disabled && styles.disabled]}>
    <PressableScale accessibilityRole="button" accessibilityLabel={`Set ${label.toLowerCase()} ${step} minutes earlier`} disabled={disabled} haptic="select" pressedScale={0.88} onPress={() => onChange(-step)} style={styles.timeButton}>
      <Txt weight="black" size={24} color={colors.child.skyDeep}>−</Txt>
    </PressableScale>
    <View accessibilityRole="text" accessibilityLabel={`${label} ${value}`} style={styles.timeValue}>
      <Txt weight="black" size={24} color={colors.parent.night}>{value}</Txt>
      <Txt size={12} color={colors.parent.muted}>{hint}</Txt>
    </View>
    <PressableScale accessibilityRole="button" accessibilityLabel={`Set ${label.toLowerCase()} ${step} minutes later`} disabled={disabled} haptic="select" pressedScale={0.88} onPress={() => onChange(step)} style={styles.timeButton}>
      <Txt weight="black" size={24} color={colors.child.skyDeep}>＋</Txt>
    </PressableScale>
  </View>;
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 18 },
  section: { gap: 12 },
  bedtimeCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: 16, gap: 18, ...shadows.card },
  bedtimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bedtimeCopy: { flex: 1, gap: 2 },
  timeAdjuster: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeButton: { width: controls.minTouchParent, height: controls.minTouchParent, borderRadius: controls.minTouchParent / 2, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  timeValue: { flex: 1, alignItems: 'center', gap: 2 },
  disabled: { opacity: 0.45 },
});

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DAILY_LIMIT_MINUTES, formatDailyLimit } from '@littleloop/shared';
import { AppIcon, ParentHeader, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, Txt } from '@/components';
import { useAppStore } from '@/stores/appStore';
import { useForgotPin } from '@/features/security/forgotPin';

export default function Safety() {
  const router = useRouter();
  const resetPin = useForgotPin();
  const profile = useAppStore((state) =>
    state.childProfiles.find((child) => child.id === state.activeChildProfileId) ??
    state.childProfiles[0] ??
    null,
  );
  const name = profile?.nickname ?? 'Your child';

  return (
    <ScreenContainer scroll style={styles.root}>
      <ParentHeader title="Parent PIN" subtitle="Protects every grown-up control" onBack={() => router.back()} />
      <View style={styles.summary}>
        <Txt weight="black" size={18}>What the PIN protects</Txt>
        <View style={styles.fact}><View style={styles.marker}><Txt weight="black">1</Txt></View><Txt size={14} lineHeight={21} style={styles.factCopy}>{name} cannot leave Child Mode or open settings.</Txt></View>
        <View style={styles.fact}><View style={styles.marker}><Txt weight="black">2</Txt></View><Txt size={14} lineHeight={21} style={styles.factCopy}>Only your approved videos can play.</Txt></View>
        <View style={styles.fact}><View style={styles.marker}><Txt weight="black">3</Txt></View><Txt size={14} lineHeight={21} style={styles.factCopy}>The daily limit is {formatDailyLimit(profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default)}.</Txt></View>
      </View>
      <SectionLabel>PIN controls</SectionLabel>
      <SettingsGroup>
        <SettingsRow icon={<AppIcon name="pin" />} iconBg="transparent" title="Change PIN" chevron onPress={() => router.push('/(parent)/change-pin')} />
        <SettingsRow icon={<AppIcon name="restore" />} iconBg="transparent" title="Forgot PIN" value="Reset and sign out" chevron onPress={resetPin} />
      </SettingsGroup>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  summary: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 15 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marker: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EAF6FA', alignItems: 'center', justifyContent: 'center' },
  factCopy: { flex: 1 },
});

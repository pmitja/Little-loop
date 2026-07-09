import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { DAILY_LIMIT_MINUTES, FREE_LIMITS } from '@littleloop/shared';
import { ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { useDeleteAccount } from '@/features/security/deleteAccount';

function DeleteIcon() {
  return (
    <Svg width={15} height={17} viewBox="0 0 15 17">
      <Path d="M1 4 H14" stroke={colors.red} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M5 4 V2.5 a1 1 0 0 1 1-1 h3 a1 1 0 0 1 1 1 V4" stroke={colors.red} strokeWidth={2} fill="none" />
      <Path
        d="M3 4 L3.8 14.5 a1.5 1.5 0 0 0 1.5 1.4 h4.4 a1.5 1.5 0 0 0 1.5-1.4 L12 4"
        stroke={colors.red}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={6} fill={colors.primary} />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Circle cx={9} cy={9} r={7} stroke="#E8A93D" strokeWidth={2.4} fill="none" />
      <Path d="M9 5.5 V9 L11.5 10.8" stroke="#E8A93D" strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={16} height={18} viewBox="0 0 16 18">
      <Path
        d="M4.5 8 V5.5 a3.5 3.5 0 0 1 7 0 V8"
        stroke={colors.primary}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <Rect x={1.5} y={7.5} width={13} height={9.5} rx={3.5} fill={colors.primary} />
    </Svg>
  );
}

function FaceIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Rect x={1.5} y={1.5} width={15} height={15} rx={5} stroke={colors.greenDark} strokeWidth={2.2} fill="none" />
      <Circle cx={6.5} cy={7} r={1.2} fill={colors.greenDark} />
      <Circle cx={11.5} cy={7} r={1.2} fill={colors.greenDark} />
      <Path d="M6 11.5 Q9 13.7 12 11.5" stroke={colors.greenDark} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function RowsIcon() {
  return (
    <View style={{ gap: 2.5 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 12, height: 2.5, borderRadius: 2, backgroundColor: colors.coral }} />
      ))}
    </View>
  );
}

function PrivacyIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={6} stroke="#A97BD1" strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

function HelpIcon() {
  return (
    <Txt weight="extrabold" size={15} color={colors.primary}>
      ?
    </Txt>
  );
}

function DocIcon() {
  return <Rect width={11} height={13} rx={3} x={0} y={0} stroke={colors.subtle} strokeWidth={2.5} fill="none" />;
}

function TermsIcon() {
  return (
    <Svg width={11} height={13} viewBox="-1.5 -1.5 14 16">
      <DocIcon />
    </Svg>
  );
}

/** s18 — settings: premium banner + Family / Security / More groups. */
export default function Settings() {
  const router = useRouter();
  const biometricEnabled = useLockStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled);
  const profileCount = useAppStore((s) => s.childProfiles.length);
  const profile = useAppStore((s) =>
    s.childProfiles.find((p) => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null,
  );
  const limit = profile?.dailyLimitMinutes ?? DAILY_LIMIT_MINUTES.default;
  const premium = usePremium();
  const deleteAccount = useDeleteAccount();

  const toggleBiometrics = async (next: boolean) => {
    if (!next) {
      setBiometricEnabled(false);
      return;
    }
    const enrolled =
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync());
    if (!enrolled) {
      Alert.alert('Face ID unavailable', 'Set up Face ID / fingerprint in system settings first.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable Face ID for parent unlock',
    });
    if (result.success) setBiometricEnabled(true);
  };

  const staticLink = (title: string) => () =>
    Alert.alert(title, 'This page ships with store readiness in Phase 5.');

  return (
    <ScreenContainer scroll style={styles.container}>
      <Txt weight="black" size={24} style={{ marginBottom: 16 }}>
        Settings
      </Txt>

      <Pressable
        onPress={() => (premium ? undefined : router.push('/paywall'))}
        style={styles.bannerShadow}
      >
        <LinearGradient
          colors={['#6FBBFB', '#4A9FF0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerStar}>
            <Txt size={19} color="#FFE9A8">
              ★
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="black" size={15} color="#FFFFFF">
              LittleLoop Premium
            </Txt>
            <Txt weight="semibold" size={12} color="rgba(255,255,255,.85)">
              {premium ? 'Thanks for supporting LittleLoop' : 'More profiles, playlists & sync'}
            </Txt>
          </View>
          <View style={styles.bannerCta}>
            <Txt weight="extrabold" size={12.5} color={colors.primaryDark}>
              {premium ? 'Active' : 'Upgrade'}
            </Txt>
          </View>
        </LinearGradient>
      </Pressable>

      <SectionLabel style={styles.sectionLabel}>Family</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<ProfileIcon />}
          iconBg={colors.primaryTint}
          label="Child profiles"
          value={premium ? `${profileCount}` : `${profileCount} of ${FREE_LIMITS.childProfiles}`}
          chevron
          onPress={() => {
            // Free plan allows 1 profile — the second opens the paywall (PLAN §12).
            if (!premium && profileCount >= FREE_LIMITS.childProfiles) {
              router.push('/paywall');
            } else {
              router.push('/(parent)/add-child');
            }
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={<ClockIcon />}
          iconBg={colors.amberTint}
          label="Time limits"
          value={profile?.dailyLimitMinutes === null ? 'None' : `${limit} min`}
          chevron
          onPress={() => router.push('/(parent)/time-limit')}
        />
      </SettingsGroup>

      <SectionLabel style={styles.sectionLabel}>Security</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<PinIcon />}
          iconBg={colors.primaryTint}
          label="Parent PIN"
          value="Change"
          chevron
          onPress={() => router.push('/(parent)/change-pin')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={<FaceIcon />}
          iconBg={colors.greenTint}
          label="Face ID unlock"
          toggle={{ value: biometricEnabled, onChange: toggleBiometrics }}
        />
      </SettingsGroup>

      <SectionLabel style={styles.sectionLabel}>More</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<RowsIcon />}
          iconBg={colors.coralTint}
          label="Playlist settings"
          chevron
          onPress={() => router.navigate('/(parent)/(tabs)/playlist')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={<PrivacyIcon />}
          iconBg="#EFE1F8"
          label="Privacy"
          chevron
          onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'privacy' } })}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={<HelpIcon />}
          iconBg={colors.primaryTint}
          label="Help & contact support"
          chevron
          onPress={staticLink('Help & support')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={<TermsIcon />}
          iconBg="#F0F2F6"
          label="Terms of use"
          chevron
          onPress={() => router.push({ pathname: '/(parent)/legal', params: { doc: 'terms' } })}
        />
      </SettingsGroup>

      <SectionLabel style={styles.sectionLabel}>Account</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<DeleteIcon />}
          iconBg="#FDECEC"
          label="Delete account & data"
          chevron
          onPress={deleteAccount}
        />
      </SettingsGroup>

      <Txt weight="semibold" size={11.5} color={colors.subtle} center style={styles.footnote}>
        Videos play through the official embedded player. YouTube is a trademark of Google LLC;
        LittleLoop is not affiliated.
      </Txt>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24 },
  bannerShadow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  banner: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerStar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  sectionLabel: { marginTop: 18, marginBottom: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  footnote: { marginTop: 20, marginBottom: 8, paddingHorizontal: 12, lineHeight: 16 },
});

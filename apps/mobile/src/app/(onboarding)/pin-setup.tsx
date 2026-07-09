import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import Svg, { Path, Rect } from 'react-native-svg';
import { Button, PINDots, PINKeypad, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { savePin } from '@/lib/pin';
import { useLockStore } from '@/stores/lockStore';

const PIN_LENGTH = 4;

function LockIcon() {
  return (
    <View style={styles.iconBox}>
      <Svg width={26} height={29} viewBox="0 0 26 29">
        <Path
          d="M6.5 12 V8 a6.5 6.5 0 0 1 13 0 v4"
          stroke={colors.primary}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <Rect x={1} y={11} width={24} height={17} rx={6} fill={colors.primary} />
      </Svg>
    </View>
  );
}

type Step = 'enter' | 'confirm' | 'biometric';

/** s05 — parent PIN setup: enter → confirm → Face ID opt-in. */
export default function PinSetup() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const setPinSet = useLockStore((s) => s.setPinSet);
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled);

  const proceedAfterPin = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
    if (enrolled) {
      setStep('biometric');
    } else {
      router.replace('/(onboarding)/child-profile');
    }
  };

  const onDigit = async (digit: string) => {
    if (saving || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    if (step === 'enter') {
      setFirstPin(next);
      setTimeout(() => {
        setPin('');
        setStep('confirm');
      }, 180);
      return;
    }

    if (next === firstPin) {
      setSaving(true);
      await savePin(next);
      setPinSet(true);
      setSaving(false);
      await proceedAfterPin();
    } else {
      setErrorFlash(true);
      setTimeout(() => {
        setErrorFlash(false);
        setPin('');
        setFirstPin('');
        setStep('enter');
      }, 600);
    }
  };

  const enableBiometrics = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable Face ID for parent unlock',
    });
    if (result.success) {
      setBiometricEnabled(true);
    }
    router.replace('/(onboarding)/child-profile');
  };

  if (step === 'biometric') {
    return (
      <ScreenContainer>
        <View style={styles.bioWrap}>
          <LockIcon />
          <Txt weight="black" size={26} center>
            Unlock with Face ID?
          </Txt>
          <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
            Use Face ID instead of typing your PIN when exiting child mode. Your PIN stays as a
            fallback.
          </Txt>
          <View style={styles.bioButtons}>
            <Button title="Enable Face ID" onPress={enableBiometrics} />
            <Button
              title="Not now"
              variant="ghost"
              onPress={() => router.replace('/(onboarding)/child-profile')}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const isConfirm = step === 'confirm';

  return (
    <ScreenContainer style={styles.container}>
      <LockIcon />
      <Txt weight="black" size={26} center style={{ marginBottom: 8 }}>
        {isConfirm ? 'Confirm your PIN' : 'Create your Parent PIN'}
      </Txt>
      <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
        {isConfirm ? 'Enter the same 4 digits again.' : 'This keeps settings protected from children.'}
      </Txt>
      <View style={styles.dots}>
        <PINDots length={PIN_LENGTH} filled={errorFlash ? PIN_LENGTH : pin.length} error={errorFlash} />
      </View>
      <PINKeypad
        onDigit={onDigit}
        onDelete={() => setPin((p) => p.slice(0, -1))}
        disabled={saving}
      />
      <View style={{ flex: 1 }} />
      <Txt weight="bold" size={14} color={colors.primary} center>
        Enable Face ID on the next step
      </Txt>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 28 },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  dots: { marginTop: 34, marginBottom: 38 },
  bioWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 8 },
  bioButtons: { alignSelf: 'stretch', gap: 8, marginTop: 20 },
});

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PINBoxes, PINKeypad, ScreenContainer, StoryIllustration, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { savePin } from '@/lib/pin';
import { useLockStore } from '@/stores/lockStore';
import { useAppStore } from '@/stores/appStore';

const PIN_LENGTH = 4;

type Step = 'enter' | 'confirm';

/** s05 — parent PIN setup: enter → confirm. The PIN is the only unlock method. */
export default function PinSetup() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const setPinSet = useLockStore((s) => s.setPinSet);

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
      if (useAppStore.getState().childProfiles.length > 0) {
        useAppStore.getState().setOnboardingComplete(true);
        router.replace('/whos-watching');
      } else {
        router.replace('/(onboarding)/child-profile');
      }
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

  const isConfirm = step === 'confirm';

  return (
    <ScreenContainer scroll style={styles.container}>
      <StoryIllustration scene="pin-safe" width={132} style={styles.lockStage} />
      <Txt weight="black" size={12} color={colors.primaryDark} style={styles.stepLabel}>STEP 1 OF 3</Txt>
      <Txt weight="black" size={26} center style={{ marginBottom: 8 }}>
        {isConfirm ? 'Confirm your PIN' : 'Create your Parent PIN'}
      </Txt>
      <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
        {isConfirm ? 'Enter the same 4 digits again.' : 'This keeps settings protected from children.'}
      </Txt>
      <View style={styles.dots}>
        <PINBoxes length={PIN_LENGTH} filled={errorFlash ? PIN_LENGTH : pin.length} error={errorFlash} checking={saving} />
      </View>
      <PINKeypad
        onDigit={onDigit}
        onDelete={() => setPin((p) => p.slice(0, -1))}
        disabled={saving}
      />
      <View style={{ flex: 1 }} />
      <Txt weight="bold" size={14} color={colors.muted} center>
        You’ll need this PIN to leave Child Mode.
      </Txt>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingTop: 22, paddingHorizontal: 28 },
  lockStage: { borderRadius: 24, marginBottom: 14 },
  stepLabel: { marginBottom: 10, letterSpacing: 0.8 },
  dots: { marginTop: 34, marginBottom: 38 },
});

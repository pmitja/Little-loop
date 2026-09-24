import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Appear, Float, PINBoxes, PINKeypad, ScreenContainer, StepHeader, StoryIllustration, Txt } from '@/components';
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
      const app = useAppStore.getState();
      if (app.familyRole === 'caregiver' || app.childProfiles.length > 0) {
        app.setOnboardingComplete(true);
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
      <StepHeader step={1} total={3} onBack={router.canGoBack() ? () => router.back() : undefined} />
      <Appear index={0} style={styles.art}>
        <Float distance={5} sway={1.5} duration={2400}>
          <StoryIllustration scene="pin-safe" width={190} />
        </Float>
      </Appear>
      <Appear index={1} key={step} style={styles.copy}>
        <Txt weight="black" size={28} center>
          {isConfirm ? 'Type it once more' : 'Make a grown-up PIN'}
        </Txt>
        <Txt weight="bold" size={15} color={colors.muted} center lineHeight={21.75} style={styles.body}>
          {isConfirm ? 'Enter the same 4 digits again.' : 'You’ll need it to leave Child Mode and to change settings.'}
        </Txt>
      </Appear>
      <Appear index={2} style={styles.dots}>
        <PINBoxes length={PIN_LENGTH} filled={errorFlash ? PIN_LENGTH : pin.length} error={errorFlash} checking={saving} />
      </Appear>
      <View style={{ flex: 1 }} />
      <Appear index={3} style={styles.keypad}>
        <PINKeypad
          onDigit={onDigit}
          onDelete={() => setPin((p) => p.slice(0, -1))}
          disabled={saving}
        />
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingTop: 16, paddingHorizontal: 24, gap: 18 },
  art: { marginTop: 6 },
  copy: { alignItems: 'center', gap: 6 },
  body: { maxWidth: 300 },
  dots: { marginTop: 4 },
  keypad: { width: '100%', alignItems: 'center' },
});

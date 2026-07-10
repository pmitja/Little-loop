import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ParentHeader, PINBoxes, PINKeypad, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { savePin, verifyPin } from '@/lib/pin';

const PIN_LENGTH = 4;

type Step = 'current' | 'enter' | 'confirm';

const COPY: Record<Step, { title: string; body: string }> = {
  current: { title: 'Enter current PIN', body: 'Confirm it’s you before choosing a new PIN.' },
  enter: { title: 'Choose a new PIN', body: 'This keeps settings protected from children.' },
  confirm: { title: 'Confirm your new PIN', body: 'Enter the same 4 digits again.' },
};

/** Settings → Parent PIN: verify current, then enter + confirm a new one (reuses s05 keypad). */
export default function ChangePin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('current');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  const fail = (nextStep: Step) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setErrorFlash(true);
    setTimeout(() => {
      setErrorFlash(false);
      setPin('');
      if (nextStep !== step) {
        setFirstPin('');
        setStep(nextStep);
      }
    }, 600);
  };

  const onDigit = async (digit: string) => {
    if (busy || errorFlash || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    if (step === 'current') {
      setBusy(true);
      const ok = await verifyPin(next);
      setBusy(false);
      if (ok) {
        setPin('');
        setStep('enter');
      } else {
        fail('current');
      }
      return;
    }

    if (step === 'enter') {
      setFirstPin(next);
      setTimeout(() => {
        setPin('');
        setStep('confirm');
      }, 180);
      return;
    }

    if (next === firstPin) {
      setBusy(true);
      await savePin(next);
      setBusy(false);
      router.back();
    } else {
      fail('enter');
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <ParentHeader title="Parent PIN" onBack={() => router.back()} />
      <View style={styles.body}>
        <Txt weight="black" size={26} center style={{ marginBottom: 8 }}>
          {COPY[step].title}
        </Txt>
        <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
          {COPY[step].body}
        </Txt>
        <View style={styles.dots}>
          <PINBoxes
            length={PIN_LENGTH}
            filled={errorFlash ? PIN_LENGTH : pin.length}
            error={errorFlash}
          />
        </View>
        <PINKeypad onDigit={onDigit} onDelete={() => setPin((p) => p.slice(0, -1))} disabled={busy} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  body: { flex: 1, alignItems: 'center', paddingTop: 28 },
  dots: { marginTop: 34, marginBottom: 38 },
});

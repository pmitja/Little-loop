import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { PINBoxes, PINKeypad, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { verifyPin } from '@/lib/pin';
import { recordSecurityEvent } from '@/lib/monitoring';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';
import { useForgotPin } from '@/features/security/forgotPin';

const PIN_LENGTH = 4;

/** PIN unlock modal — the only exit from child mode (PLAN §10/§11). */
export default function PinUnlock() {
  const router = useRouter();
  // Optional destination after a successful unlock (e.g. who's-watching → dashboard).
  const { next } = useLocalSearchParams<{ next?: string }>();
  const forgotPin = useForgotPin();
  const [pin, setPin] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const childModeActive = useLockStore((s) => s.childMode.active);
  const biometricEnabled = useLockStore((s) => s.biometricEnabled);
  const lockoutUntil = useLockStore((s) => s.lockoutUntil);
  const failedAttempts = useLockStore((s) => s.failedAttempts);

  const lockedOut = lockoutUntil !== null && lockoutUntil > now;
  const lockoutSecondsLeft = lockedOut ? Math.ceil((lockoutUntil - now) / 1000) : 0;

  // Tick each second while a lockout is set so the countdown counts down.
  useEffect(() => {
    if (lockoutUntil === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const succeed = () => {
    useLockStore.getState().resetAttempts();
    if (childModeActive) {
      // Exit child mode: close the watch session, flip the store, land on the dashboard.
      const timer = useTimerStore.getState();
      if (timer.activeSessionId) timer.endSession('parent_exit');
      useLockStore.getState().setChildMode(false);
      // Changing the protected-route guard removes the child stack. Replacing
      // the unlock modal is sufficient; dismissAll() can race that removal and
      // dispatch POP_TO_TOP after there is no stack left to pop.
      router.replace('/(parent)/(tabs)');
    } else if (next) {
      router.replace(next as Parameters<typeof router.replace>[0]);
    } else {
      router.back();
    }
  };

  const tryBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock LittleLoop',
    });
    if (result.success) succeed();
  };

  const onDigit = async (digit: string) => {
    if (checking || lockedOut || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setChecking(true);
    const ok = await verifyPin(next);
    setChecking(false);
    if (ok) {
      succeed();
      return;
    }
    const lockoutBefore = useLockStore.getState().lockoutUntil;
    useLockStore.getState().recordFailedAttempt();
    recordSecurityEvent('pin_failed');
    if (useLockStore.getState().lockoutUntil !== lockoutBefore) {
      recordSecurityEvent('pin_lockout');
      setNow(Date.now());
    }
    setErrorFlash(true);
    setTimeout(() => {
      setErrorFlash(false);
      setPin('');
    }, 600);
  };

  const attemptsLeft = Math.max(0, 3 - (failedAttempts % 3));

  return (
    <ScreenContainer style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close grown-up unlock"
        hitSlop={10}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
      >
        <Txt weight="bold" size={24} color={colors.parent.muted}>
          ×
        </Txt>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Txt size={44}>🦉</Txt>
      <Txt weight="black" size={23} color={colors.parent.night} center style={{ marginTop: 6 }}>
        Grown-ups only!
      </Txt>
      <Txt weight="semibold" size={13.5} color={colors.parent.muted} center lineHeight={20} style={styles.sub}>
        {lockedOut
          ? `Too many tries. Wait ${lockoutSecondsLeft} s and try again.`
          : childModeActive ? 'Enter your PIN to leave Child Mode and open settings.' : 'Enter your Parent PIN to open settings.'}
      </Txt>
      <View style={styles.boxes}>
        <PINBoxes
          length={PIN_LENGTH}
          filled={errorFlash ? PIN_LENGTH : pin.length}
          error={errorFlash}
        />
      </View>
      <PINKeypad
        onDigit={onDigit}
        onDelete={() => setPin((p) => p.slice(0, -1))}
        disabled={checking || lockedOut}
      />
      {!lockedOut && failedAttempts > 0 ? (
        <Txt weight="bold" size={13} color={colors.red} center style={{ marginTop: 14 }}>
          Wrong PIN — {attemptsLeft} {attemptsLeft === 1 ? 'try' : 'tries'} left
        </Txt>
      ) : null}
      <View style={styles.links}>
        {biometricEnabled && !lockedOut ? (
          <Pressable onPress={tryBiometric} hitSlop={10}>
            <Txt weight="extrabold" size={13.5} color={colors.child.skyDeep}>
              Use Face ID
            </Txt>
          </Pressable>
        ) : null}
        <Pressable onPress={forgotPin} hitSlop={10}>
          <Txt weight="extrabold" size={13.5} color={colors.child.skyDeep}>
            Forgot PIN?
          </Txt>
        </Pressable>
      </View>
      <View style={{ flex: 1.4 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 28, position: 'relative' },
  close: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.parent.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.65 },
  sub: { marginTop: 8, maxWidth: 250 },
  boxes: { marginTop: 20, marginBottom: 22 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 18 },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import Svg, { Path, Rect } from 'react-native-svg';
import { PINDots, PINKeypad, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { verifyPin } from '@/lib/pin';
import { recordSecurityEvent } from '@/lib/monitoring';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';
import { useForgotPin } from '@/features/security/forgotPin';

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
      router.dismissAll();
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

  const attemptsLeft = Math.max(0, 5 - (failedAttempts % 5));

  return (
    <ScreenContainer style={styles.container}>
      <LockIcon />
      <Txt weight="black" size={26} center style={{ marginBottom: 8 }}>
        Parents only
      </Txt>
      <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21.75}>
        {lockedOut
          ? `Too many tries. Wait ${lockoutSecondsLeft} s and try again.`
          : 'Enter your Parent PIN to continue.'}
      </Txt>
      <View style={styles.dots}>
        <PINDots length={PIN_LENGTH} filled={errorFlash ? PIN_LENGTH : pin.length} error={errorFlash} />
      </View>
      <PINKeypad
        onDigit={onDigit}
        onDelete={() => setPin((p) => p.slice(0, -1))}
        disabled={checking || lockedOut}
      />
      {!lockedOut && failedAttempts > 0 ? (
        <Txt weight="bold" size={13} color={colors.red} center style={{ marginTop: 16 }}>
          Wrong PIN — {attemptsLeft} {attemptsLeft === 1 ? 'try' : 'tries'} left
        </Txt>
      ) : null}
      <View style={{ flex: 1 }} />
      {biometricEnabled && !lockedOut ? (
        <Pressable onPress={tryBiometric} hitSlop={10}>
          <Txt weight="bold" size={14} color={colors.primary} center>
            Use Face ID instead
          </Txt>
        </Pressable>
      ) : null}
      <Pressable onPress={forgotPin} hitSlop={10} style={{ marginTop: 14 }}>
        <Txt weight="bold" size={13.5} color={colors.subtle} center>
          Forgot PIN?
        </Txt>
      </Pressable>
      {!childModeActive ? (
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: 14 }}>
          <Txt weight="bold" size={14} color={colors.subtle} center>
            Cancel
          </Txt>
        </Pressable>
      ) : null}
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
});

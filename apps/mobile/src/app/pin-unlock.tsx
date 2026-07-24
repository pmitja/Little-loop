import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { AppDialogHost, PINBoxes, PINKeypad, ScreenContainer, StoryIllustration, Txt } from '@/components';
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
  const { next, completing } = useLocalSearchParams<{ next?: string; completing?: string }>();
  const shareFlow = next === '/share-video';
  const { resetShareIntent } = useShareIntentContext();
  const forgotPin = useForgotPin();
  const [completingUnlock, setCompletingUnlock] = useState(completing === '1');
  const [pin, setPin] = useState('');
  const [errorFlash, setErrorFlash] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const childModeActive = useLockStore((s) => s.childMode.active);
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

  // `completing=1` lives in navigation state, so it survives the protected
  // navigator rebuilding when Child Mode turns off. The remounted route shows
  // only the transition state and then enters Parent Hub.
  useEffect(() => {
    if (completing !== '1' || childModeActive) return;
    const destination = next ?? '/(parent)/(tabs)';
    requestAnimationFrame(() => {
      router.replace('/(parent)/(tabs)');
      if (destination !== '/(parent)/(tabs)') {
        requestAnimationFrame(() => {
          router.push(destination as Parameters<typeof router.push>[0]);
        });
      }
    });
  }, [childModeActive, completing, next, router]);

  const succeed = () => {
    useLockStore.getState().resetAttempts();
    if (childModeActive) {
      // Exit child mode and establish the Parent Hub beneath the requested
      // destination so Back/Done returns to normal parent navigation.
      const timer = useTimerStore.getState();
      if (timer.activeSessionId) timer.endSession('parent_exit');
      setCompletingUnlock(true);
      router.setParams({ completing: '1' });
      // Give the native router one frame to persist the transition parameter
      // before changing the protected route tree.
      requestAnimationFrame(() => {
        useLockStore.getState().setChildMode(false);
      });
    } else if (next) {
      router.replace(next as Parameters<typeof router.replace>[0]);
    } else {
      // The PIN screen can be restored or opened as the current stack root.
      // A successful unlock must always have a concrete parent destination.
      router.replace('/(parent)/(tabs)');
    }
  };

  const dismiss = () => {
    if (shareFlow) resetShareIntent();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Never leave a root PIN screen trapped, and never expose parent routes
    // when the user dismissed without successfully unlocking.
    router.replace(childModeActive ? '/(child)' : '/whos-watching');
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

  if (completingUnlock || completing === '1') {
    return (
      <ScreenContainer style={styles.transition}>
        <ActivityIndicator size="large" color={colors.child.skyDeep} />
        <Txt weight="black" size={18} color={colors.parent.night} center>
          Opening Parent Hub…
        </Txt>
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.closeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close grown-up unlock"
            hitSlop={10}
            onPress={dismiss}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Txt weight="bold" size={24} color={colors.parent.muted}>
              ×
            </Txt>
          </Pressable>
        </View>
        <View style={{ flex: 0.7 }} />
        <StoryIllustration scene="pin-safe" width={124} style={styles.lockStage} />
        <Txt weight="black" size={23} color={colors.parent.night} center style={{ marginTop: 6 }}>
          Enter parent PIN
        </Txt>
        <Txt weight="semibold" size={13.5} color={colors.parent.muted} center lineHeight={20} style={styles.sub}>
          {lockedOut
            ? `Too many tries. Wait ${lockoutSecondsLeft} s and try again.`
            : shareFlow
              ? childModeActive
                ? 'Unlock Parent Hub to add this shared video.'
                : 'Unlock parent controls to add this shared video.'
              : childModeActive
                ? 'This closes Child Mode and returns to parent controls.'
                : 'Unlock parent controls.'}
        </Txt>
        <View style={styles.boxes}>
          <PINBoxes
            length={PIN_LENGTH}
            filled={errorFlash ? PIN_LENGTH : pin.length}
            error={errorFlash}
            checking={checking}
          />
        </View>
        <PINKeypad
          onDigit={onDigit}
          onDelete={() => setPin((p) => p.slice(0, -1))}
          disabled={checking || lockedOut}
        />
        {checking ? (
          <View style={styles.status}>
            <ActivityIndicator size="small" color={colors.child.skyDeep} />
            <Txt weight="bold" size={13} color={colors.parent.muted}>
              Checking…
            </Txt>
          </View>
        ) : !lockedOut && failedAttempts > 0 ? (
          <Txt weight="bold" size={13} color={colors.red} center style={{ marginTop: 14 }}>
            Wrong PIN — {attemptsLeft} {attemptsLeft === 1 ? 'try' : 'tries'} left
          </Txt>
        ) : null}
        <View style={styles.links}>
          <Pressable onPress={forgotPin} hitSlop={10}>
            <Txt weight="extrabold" size={13.5} color={colors.child.skyDeep}>
              Forgot PIN?
            </Txt>
          </Pressable>
        </View>
        <View style={{ flex: 1.4 }} />
      </ScreenContainer>
      {/* This screen is presented as a modal, so dialogs must draw inside it;
          a root-level <Modal> would be presented behind it and swallow taps. */}
      <AppDialogHost nested />
    </>
  );
}

const styles = StyleSheet.create({
  // flexGrow (not flex) so the spacers below centre the keypad when it fits and
  // collapse to let it scroll when it doesn't — e.g. landscape, exiting the player.
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
  transition: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  closeRow: { width: '100%', alignItems: 'flex-end' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.parent.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.65 },
  sub: { marginTop: 8, maxWidth: 250 },
  lockStage: { borderRadius: 22, marginBottom: 8 },
  boxes: { marginTop: 20, marginBottom: 22 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 18 },
});

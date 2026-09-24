import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppDialogHost, PINBoxes, PINKeypad, ScreenContainer, StoryIllustration, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { ApiError } from '@/lib/api';
import { signOutKidDevice } from '@/features/kid/kidSync';

const PIN_LENGTH = 4;

/**
 * Kid device → Grown-ups: the only way out of a child's own device besides
 * unpairing it from a parent phone. The parent PIN (the one from their own
 * phone) is checked by the server, then the device is logged out and returns
 * to the sign-in screen.
 */
export default function KidSignOut() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(child)');
  };

  const fail = (text: string) => {
    setMessage(text);
    setErrorFlash(true);
    setTimeout(() => {
      setErrorFlash(false);
      setPin('');
    }, 600);
  };

  const onDigit = async (digit: string) => {
    if (checking || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setChecking(true);
    setMessage(null);
    try {
      await signOutKidDevice(next);
      // The protected navigator drops kid mode on the store reset; the splash
      // then lands on sign-in.
      requestAnimationFrame(() => router.replace('/'));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PIN_INCORRECT') {
        fail('Wrong PIN — try again.');
      } else if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
        fail('Too many tries. Wait 5 minutes and try again.');
      } else if (error instanceof ApiError && error.code === 'PIN_NOT_AVAILABLE') {
        fail(
          'Open LittleLoop on your phone and unlock it once, then try again — or unpair this device from Settings → Kid devices.',
        );
      } else {
        fail('Couldn’t check the PIN. Check the internet connection and try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.closeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={close}
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
          Grown-ups only
        </Txt>
        <Txt weight="semibold" size={13.5} color={colors.parent.muted} center lineHeight={20} style={styles.sub}>
          Enter your parent PIN to log out this device.
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
          disabled={checking}
        />
        {checking ? (
          <View style={styles.status}>
            <ActivityIndicator size="small" color={colors.child.skyDeep} />
            <Txt weight="bold" size={13} color={colors.parent.muted}>
              Checking…
            </Txt>
          </View>
        ) : message ? (
          <Txt
            accessibilityLiveRegion="polite"
            weight="bold"
            size={13}
            color={colors.red}
            center
            lineHeight={19}
            style={styles.message}
          >
            {message}
          </Txt>
        ) : null}
        <View style={{ flex: 1.4 }} />
      </ScreenContainer>
      <AppDialogHost nested />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
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
  sub: { marginTop: 8, maxWidth: 260 },
  lockStage: { borderRadius: 22, marginBottom: 8 },
  boxes: { marginTop: 20, marginBottom: 22 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  message: { marginTop: 14, maxWidth: 290 },
});

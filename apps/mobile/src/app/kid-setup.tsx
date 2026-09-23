import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';
import { Button, Card, ChildAvatar, ScreenContainer, Txt } from '@/components';
import { Logo } from '@/components/Logo';
import { KidDevicesArt } from '@/features/kid/KidDevicesArt';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import {
  activateKidDevice,
  kidPairingLink,
  pollKidPairing,
  startKidPairing,
  type PairingStatus,
} from '@/features/kid/kidSync';

const POLL_INTERVAL_MS = 2000;

function useQrSvg(value: string | null): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setSvg(null);
    if (!value) return;
    void QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 224,
      color: { dark: colors.parent.night, light: '#FFFFFF' },
    }).then((next) => {
      if (active) setSvg(next);
    });
    return () => {
      active = false;
    };
  }, [value]);
  return svg;
}

type Step = 'intro' | 'code' | 'done';
type PairedDevice = Extract<PairingStatus, { status: 'paired' }>['device'];

/**
 * Setting up a child's own phone or tablet. The grown-up does this once: the
 * device shows a code, their phone claims it for one child, and from then on
 * this install only plays that child's approved videos — no sign-in here.
 */
export default function KidSetup() {
  const router = useRouter();
  const pairing = useKidDeviceStore((s) => s.pairing);
  const [step, setStep] = useState<Step>(pairing ? 'code' : 'intro');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<PairedDevice | null>(null);
  const child = useAppStore((s) => s.childProfiles[0] ?? null);
  const polling = useRef(false);
  const qr = useQrSvg(step === 'code' && pairing ? kidPairingLink(pairing.code) : null);

  // Relaunching mid-setup comes back here rather than to parent sign-in.
  useEffect(() => {
    useKidDeviceStore.getState().setSetupMode(true);
  }, []);

  const newCode = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await startKidPairing();
      setStep('code');
    } catch {
      setError('Could not reach LittleLoop. Check the internet connection and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  // Poll until a grown-up's phone claims the code; refresh an expired code.
  useEffect(() => {
    if (step !== 'code' || !pairing) return;
    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        if (new Date(pairing.expiresAt).getTime() <= Date.now()) {
          await newCode();
          return;
        }
        const result = await pollKidPairing(pairing.id);
        if (result.status === 'paired') {
          setDevice(result.device);
          setStep('done');
        } else if (result.status === 'expired') {
          await newCode();
        }
      } catch {
        // Offline blip: keep showing the code and try again on the next tick.
      } finally {
        polling.current = false;
      }
    };
    void tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [step, pairing, newCode]);

  const start = () => {
    if (!device) return;
    activateKidDevice(device);
    // The protected navigator swaps to kid mode on the store change; land on
    // the videos explicitly once it has.
    requestAnimationFrame(() => router.replace('/(child)'));
  };

  const signInInstead = () => {
    const kid = useKidDeviceStore.getState();
    kid.setPairing(null);
    kid.setSetupMode(false);
    router.replace('/(auth)/sign-in');
  };

  if (step === 'done') {
    return (
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.header}>
          {child ? <ChildAvatar avatar={child.avatar} size={96} /> : <Logo size={76} />}
          <Txt weight="black" size={27} center>
            All set{child ? ` for ${child.nickname}` : ''}!
          </Txt>
          <Txt weight="semibold" size={15} color={colors.muted} center lineHeight={22}>
            This device now only plays the videos you approve. You manage it from your own
            phone: Settings → Kid devices. After approving a video there, pull down on the
            video list here to see it straight away.
          </Txt>
        </View>
        <Card radius={24} padding={18} style={styles.tip}>
          <Txt weight="black" size={15}>
            One more tip before you hand it over
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} lineHeight={21}>
            {Platform.OS === 'ios'
              ? 'To stop your child leaving the app, turn on Guided Access: Settings → Accessibility → Guided Access. Then triple-click the side button in LittleLoop to lock it.'
              : 'To stop your child leaving the app, turn on app pinning: Settings → Security → App pinning. Then pin LittleLoop from the Recents screen.'}
          </Txt>
        </Card>
        <Button title="Start watching" onPress={start} style={styles.primary} />
      </ScreenContainer>
    );
  }

  if (step === 'code' && pairing) {
    return (
      <ScreenContainer scroll style={styles.container}>
        <View style={styles.header}>
          <Txt weight="black" size={25} center>
            Connect to your phone
          </Txt>
          <Txt weight="semibold" size={14.5} color={colors.muted} center lineHeight={21}>
            Scan this with your phone’s camera, or open LittleLoop on your phone and go to
            Settings → Kid devices → Add a kid device.
          </Txt>
        </View>
        <Card radius={28} padding={20} large style={styles.codeCard}>
          <View style={styles.qr}>
            {qr ? <SvgXml xml={qr} width={208} height={208} /> : <ActivityIndicator />}
          </View>
          <Txt weight="bold" size={13} color={colors.muted}>
            Or type this code
          </Txt>
          <Txt
            weight="black"
            size={40}
            style={styles.code}
            accessibilityLabel={`Pairing code ${pairing.code.split('').join(' ')}`}
          >
            {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
          </Txt>
          <View style={styles.waiting}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Txt weight="bold" size={13} color={colors.muted}>
              Waiting for your phone…
            </Txt>
          </View>
        </Card>
        <Pressable accessibilityRole="button" onPress={signInInstead} hitSlop={8}>
          <Txt weight="extrabold" size={14} color={colors.primaryDark} center style={styles.link}>
            Cancel — this is my own phone
          </Txt>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll style={styles.container}>
      <View style={styles.header}>
        <KidDevicesArt width={280} />
        <Txt weight="black" size={27} center>
          Set up your child’s device
        </Txt>
        <Txt weight="semibold" size={15} color={colors.muted} center lineHeight={22}>
          Use this phone or tablet as your child’s own LittleLoop. It will only play the videos
          you approve, and you stay in control from your phone. No sign-in needed here.
        </Txt>
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
          <Txt weight="bold" size={13} color={colors.red}>
            {error}
          </Txt>
        </View>
      ) : null}
      <Button title="Show pairing code" loading={busy} onPress={newCode} style={styles.primary} />
      <Pressable accessibilityRole="button" onPress={signInInstead} hitSlop={8}>
        <Txt weight="extrabold" size={14} color={colors.primaryDark} center style={styles.link}>
          I’m a grown-up — sign in instead
        </Txt>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 30, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 12, marginBottom: 24 },
  codeCard: { alignItems: 'center', gap: 10 },
  qr: { width: 208, height: 208, alignItems: 'center', justifyContent: 'center' },
  code: { letterSpacing: 6, color: colors.parent.night },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tip: { gap: 6, marginBottom: 20 },
  primary: { alignSelf: 'stretch' },
  link: { marginTop: 20 },
  errorBanner: {
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: '#FDEAE9',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});

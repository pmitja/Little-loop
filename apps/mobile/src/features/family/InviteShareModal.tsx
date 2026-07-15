import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';
import { Button, showAppAlert, Txt } from '@/components';
import { colors, shadows } from '@/theme/tokens';

const LOCAL_INVITE_URL = process.env.EXPO_PUBLIC_INVITE_URL ?? 'http://localhost:3001/invite';

function makeInviteUrl(token: string): string {
  const separator = LOCAL_INVITE_URL.includes('?') ? '&' : '?';
  return `${LOCAL_INVITE_URL}${separator}token=${encodeURIComponent(token)}`;
}

function makeInviteMessage(link: string): string {
  return `Join my LittleLoop family as a caregiver. Sign in, then open this link:\n${link}`;
}

function InviteQrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSvg(null);
    void QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 224,
      color: { dark: colors.parent.night, light: '#FFFFFF' },
    }).then((nextSvg) => {
      if (active) setSvg(nextSvg);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <View style={styles.qrStage} accessibilityLabel="Caregiver invitation QR code">
      {svg ? (
        <SvgXml xml={svg} width={208} height={208} />
      ) : (
        <ActivityIndicator color={colors.primaryDark} />
      )}
    </View>
  );
}

interface InviteShareModalProps {
  token: string | null;
  onClose: () => void;
}

export function InviteShareModal({ token, onClose }: InviteShareModalProps) {
  const [copied, setCopied] = useState(false);
  const link = token ? makeInviteUrl(token) : null;

  useEffect(() => {
    if (token) setCopied(false);
  }, [token]);

  if (!link) return null;

  const message = makeInviteMessage(link);

  const copyLink = () => {
    Clipboard.setString(link);
    setCopied(true);
  };

  const openLink = async () => {
    try {
      await Linking.openURL(link);
    } catch {
      showAppAlert('Couldn’t open the link', 'Copy the link and paste it into Safari instead.');
    }
  };

  const openMessages = async () => {
    const canMessage = await Linking.canOpenURL('sms:');
    if (!canMessage) {
      showAppAlert('Messages isn’t available', 'Copy the invitation link or use More options instead.');
      return;
    }
    const separator = Platform.OS === 'ios' ? '&' : '?';
    await Linking.openURL(`sms:${separator}body=${encodeURIComponent(message)}`);
  };

  const shareMore = async () => {
    await Share.share({ title: 'Join my LittleLoop family', message, url: link });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close invitation"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Txt weight="black" size={22} lineHeight={28}>Invite a caregiver</Txt>
                <Txt size={13.5} lineHeight={19} color={colors.parent.muted}>
                  They can scan this QR code or open the link you send.
                </Txt>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Txt weight="black" size={22} color={colors.parent.muted}>×</Txt>
              </Pressable>
            </View>

            <InviteQrCode value={link} />

            <View style={styles.linkCard}>
              <Txt size={12.5} lineHeight={18} color={colors.parent.muted} numberOfLines={2}>
                {link}
              </Txt>
            </View>

            <View style={styles.quickActions}>
              <Pressable
                accessibilityRole="button"
                onPress={copyLink}
                style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
              >
                <Txt size={22}>{copied ? '✓' : '📋'}</Txt>
                <Txt weight="extrabold" size={13.5}>{copied ? 'Copied' : 'Copy link'}</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void openLink()}
                style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
              >
                <Txt size={22}>🌐</Txt>
                <Txt weight="extrabold" size={13.5}>Open link</Txt>
              </Pressable>
            </View>

            <Button title="Send in Messages" onPress={() => void openMessages()} />
            <Button title="More options" variant="outline" onPress={() => void shareMore()} />
            <Txt size={11.5} lineHeight={17} color={colors.parent.muted} center>
              Local testing only: the link works while the LittleLoop API is running on this Mac.
            </Txt>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.52)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 44,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '94%',
    alignSelf: 'center',
    backgroundColor: colors.parent.paper,
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    ...shadows.cardLg,
  },
  content: { padding: 22, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleCopy: { flex: 1, gap: 4 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.parent.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrStage: {
    width: 224,
    height: 224,
    alignSelf: 'center',
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    ...shadows.card,
  },
  linkCard: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.parent.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: colors.parent.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

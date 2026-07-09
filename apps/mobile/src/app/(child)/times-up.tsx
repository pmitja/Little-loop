import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@/components';
import { colors } from '@/theme/tokens';

const STARS = [
  { top: 140, left: 60, size: 5, opacity: 0.6 },
  { top: 190, right: 70, size: 4, opacity: 0.45 },
  { top: 110, right: 120, size: 6, opacity: 0.5 },
  { top: 240, left: 110, size: 4, opacity: 0.4 },
] as const;

/** s16 — session end: calm night sky, only Parent unlock leads anywhere. */
export default function TimesUp() {
  const router = useRouter();
  return (
    <LinearGradient colors={colors.nightGrad} locations={[0, 0.7, 1]} style={styles.root}>
      {STARS.map((s, i) => (
        <View
          key={i}
          style={[
            styles.dotStar,
            { width: s.size, height: s.size, borderRadius: s.size / 2, opacity: s.opacity },
            'left' in s ? { top: s.top, left: s.left } : { top: s.top, right: s.right },
          ]}
        />
      ))}
      <Txt size={13} style={[styles.glyphStar, { top: 320, right: 52 }]} color="rgba(255,233,168,.7)">
        ★
      </Txt>
      <Txt size={10} style={[styles.glyphStar, { top: 90, left: 130 }]} color="rgba(255,233,168,.5)">
        ★
      </Txt>

      <View style={styles.moon}>
        <View style={styles.moonFace} />
        <View style={styles.moonShadow} />
      </View>

      <Txt weight="black" size={30} color="#FFFFFF" center>
        Time for a break
      </Txt>
      <Txt
        weight="semibold"
        size={15.5}
        color="rgba(255,255,255,.72)"
        center
        lineHeight={24}
        style={{ marginTop: 12, marginBottom: 36 }}
      >
        Great watching! Ask a parent if you need more time.
      </Txt>

      <Pressable onPress={() => router.push('/pin-unlock')} style={styles.unlockButton}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody} />
        </View>
        <Txt weight="extrabold" size={15.5} color="#FFFFFF">
          Parent unlock
        </Txt>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  dotStar: { position: 'absolute', backgroundColor: 'rgba(255,255,255,1)' },
  glyphStar: { position: 'absolute' },
  moon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#FFE9B8',
    shadowOpacity: 0.4,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  moonFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 46,
    backgroundColor: '#FFE9B8',
  },
  moonShadow: {
    position: 'absolute',
    top: -14,
    left: -22,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#26355B',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.2)',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 26,
  },
  lockShackle: {
    width: 8,
    height: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.85)',
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: { width: 13, height: 9, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.85)' },
});

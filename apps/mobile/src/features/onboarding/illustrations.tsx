import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ChildAvatar } from '@/components';
import { Txt } from '@/components';
import { colors } from '@/theme/tokens';

function Check({ size = 18 }: { size?: number }) {
  return (
    <View style={[illo.check, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 10 10">
        <Path d="M1.5 5 L4 7.5 L8.5 2.5" stroke="#FFF" strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

function SkeletonRow({ thumbColor, bg, widths }: { thumbColor: string; bg: string; widths: [number, number] }) {
  return (
    <View style={[illo.row, { backgroundColor: bg }]}>
      <View style={[illo.thumb, { backgroundColor: thumbColor }]} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={[illo.line, { width: `${widths[0]}%` }]} />
        <View style={[illo.lineLight, { width: `${widths[1]}%` }]} />
      </View>
      <Check />
    </View>
  );
}

/** s02 — approved playlist mock card. */
export function PlaylistIllustration() {
  return (
    <View style={illo.card}>
      <View style={illo.badge}>
        <Svg width={16} height={12} viewBox="0 0 14 10">
          <Path d="M1.5 5 L5 8.5 L12.5 1.5" stroke="#FFF" strokeWidth={3} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
      <Txt weight="extrabold" size={13} color={colors.muted} center style={{ marginTop: 6, marginBottom: 14 }}>
        Emma’s playlist
      </Txt>
      <View style={{ gap: 10 }}>
        <SkeletonRow thumbColor="#DDEEFE" bg="#F6FAFF" widths={[80, 50]} />
        <SkeletonRow thumbColor="#FFE4DD" bg="#FFF7F1" widths={[70, 45]} />
        <View style={illo.addRow}>
          <View style={illo.addThumb}>
            <Txt weight="extrabold" size={20} color={colors.green}>
              +
            </Txt>
          </View>
          <Txt weight="extrabold" size={13} color="#4CBE87">
            Add a video
          </Txt>
        </View>
      </View>
    </View>
  );
}

/** s03 — locked search + greyed recommendations. */
export function NoBrowsingIllustration() {
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View style={illo.searchBar}>
        <View style={illo.searchDot} />
        <View style={[illo.line, { width: 130, backgroundColor: '#D5DBE4' }]} />
        <View style={illo.lockBadge}>
          <View style={illo.lockShackle} />
          <View style={illo.lockBody} />
        </View>
        <View style={illo.strike} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, opacity: 0.85 }}>
        {[85, 75].map((w) => (
          <View key={w} style={illo.recCard}>
            <View style={illo.recThumb} />
            <View style={[illo.line, { width: `${w}%`, marginTop: 9, backgroundColor: '#D5DBE4' }]} />
            <View style={[illo.lineLight, { width: '55%', marginTop: 5, backgroundColor: '#E3E8EF' }]} />
            <View style={illo.recOverlay}>
              <View style={illo.recLock}>
                <View style={[illo.lockShackle, { borderColor: colors.subtle }]} />
                <View style={[illo.lockBody, { backgroundColor: colors.subtle }]} />
              </View>
            </View>
          </View>
        ))}
      </View>
      <Txt weight="bold" size={11} color={colors.subtle} style={{ letterSpacing: 0.55 }}>
        SEARCH & RECOMMENDATIONS — LOCKED
      </Txt>
    </View>
  );
}

/** s04 — mini child-mode card. */
export function ChildModeIllustration() {
  return (
    <LinearGradient colors={['#FFF4E4', '#FFEEDC']} style={illo.childCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <ChildAvatar avatar="bear" size={32} />
        <Txt weight="black" size={16}>
          Emma’s Videos
        </Txt>
      </View>
      <View style={{ gap: 10 }}>
        {(['#DDEEFE', '#FFE4DD'] as const).map((tint, i) => (
          <View key={tint} style={illo.childVideoCard}>
            <View style={[illo.childThumb, { backgroundColor: tint }]}>
              <View style={illo.playCircle}>
                <Svg width={12} height={12} viewBox="0 0 12 12">
                  <Path d="M3 1.5 L10.5 6 L3 10.5 Z" fill={i === 0 ? colors.primary : colors.coral} />
                </Svg>
              </View>
            </View>
            <View style={[illo.line, { width: i === 0 ? '75%' : '60%', margin: 4 }]} />
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const illo = StyleSheet.create({
  card: {
    width: 270,
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 36,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 8 },
  thumb: { width: 52, height: 36, borderRadius: 9 },
  line: { height: 8, borderRadius: 4, backgroundColor: '#DCE4EF' },
  lineLight: { height: 7, borderRadius: 4, backgroundColor: '#EBF0F7' },
  check: { backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3FBF6',
    borderRadius: 14,
    padding: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B9E8CE',
  },
  addThumb: {
    width: 52,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF1F5',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  searchDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#B4BCC9' },
  lockBadge: {
    position: 'absolute',
    right: -10,
    top: -12,
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 9,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  lockShackle: {
    width: 11,
    height: 8,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: colors.amberDark,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  lockBody: { width: 18, height: 13, borderRadius: 4, backgroundColor: colors.amberDark },
  strike: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: '50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.red,
    transform: [{ rotate: '-4deg' }],
  },
  recCard: { width: 132, backgroundColor: '#F1F3F6', borderRadius: 18, padding: 10 },
  recThumb: { height: 64, borderRadius: 12, backgroundColor: '#DFE3E9' },
  recOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recLock: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  childCard: {
    width: 230,
    borderRadius: 30,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 36,
    elevation: 6,
  },
  childVideoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  childThumb: { height: 74, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
});

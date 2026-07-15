import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChildAvatar, LockGlyph, Txt } from '@/components';
import { colors, controls } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useSecondsWatchedToday, useTimerStore } from '@/stores/timerStore';

function isToday(iso: string) { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }

/**
 * The child has no way forward from here — but the parent must. The only exit is
 * PIN-gated, so the promise of "grown-ups can add more time" is real rather than a
 * label: without it the phone is stuck on this screen until the app is killed.
 */
export default function TimesUp() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const bedtime = reason === 'bedtime';
  const p = useAppStore(s => s.childProfiles.find(x => x.id === s.activeChildProfileId) ?? s.childProfiles[0]);
  const seconds = useSecondsWatchedToday(p?.id ?? null);
  const videosToday = useTimerStore(s => new Set(s.sessions.filter(x => x.childProfileId === p?.id && isToday(x.startedAt)).flatMap(x => x.videoIds)).size);
  return <LinearGradient colors={['#FFB88A','#FF8A6B',colors.child.plum]} locations={[0,.45,1]} style={styles.root}>
    <View style={styles.glowOuter}><View style={styles.glowInner}><ChildAvatar avatar="star" size={104} /></View></View>
    <Txt weight="black" size={28} color="#fff" center style={styles.title}>{bedtime ? `It's bedtime, ${p?.nickname ?? 'friend'}!` : `All done for today, ${p?.nickname ?? 'friend'}!`}</Txt>
    <Txt weight="bold" size={14.5} color="rgba(255,255,255,.92)" center style={styles.body}>The videos will be waiting for you tomorrow. Sweet dreams!</Txt>
    <View style={styles.stats}>
      <View style={styles.stat}><Txt weight="black" size={20} color="#fff">{Math.max(1, Math.floor(seconds / 60))} min</Txt><Txt weight="bold" size={10.5} color="rgba(255,255,255,.85)">watched today</Txt></View>
      <View style={styles.stat}><Txt weight="black" size={20} color="#fff">{Math.max(1, videosToday)}</Txt><Txt weight="bold" size={10.5} color="rgba(255,255,255,.85)">{videosToday === 1 ? 'video enjoyed' : 'videos enjoyed'}</Txt></View>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Grown-ups — enter PIN to add more time"
      onPress={() => router.push('/pin-unlock')}
      style={({ pressed }) => [styles.parentOnly, pressed && styles.pressed]}
    >
      <LockGlyph color="#fff" scale={0.66} />
      <Txt weight="extrabold" size={13} color="#fff">Grown-ups can add more time</Txt>
    </Pressable>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:32,gap:16},
  glowOuter:{padding:16,borderRadius:999,backgroundColor:'rgba(255,248,236,.1)'},
  glowInner:{padding:16,borderRadius:999,backgroundColor:'rgba(255,248,236,.22)'},
  title:{maxWidth:260},
  body:{lineHeight:22,maxWidth:240},
  stats:{flexDirection:'row',gap:10},
  stat:{backgroundColor:'rgba(255,255,255,.18)',borderRadius:14,paddingVertical:9,paddingHorizontal:16,alignItems:'center',gap:1},
  parentOnly:{marginTop:10,minHeight:controls.minTouchParent,paddingVertical:12,paddingHorizontal:18,borderRadius:99,backgroundColor:'rgba(255,255,255,.22)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  pressed:{opacity:0.7},
});

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { useSecondsWatchedToday, useTimerStore } from '@/stores/timerStore';

function isToday(iso: string) { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }

/** There is intentionally no action here: only a parent can extend the day. */
export default function TimesUp() {
  const p = useAppStore(s => s.childProfiles.find(x => x.id === s.activeChildProfileId) ?? s.childProfiles[0]);
  const seconds = useSecondsWatchedToday(p?.id ?? null);
  const videosToday = useTimerStore(s => new Set(s.sessions.filter(x => x.childProfileId === p?.id && isToday(x.startedAt)).flatMap(x => x.videoIds)).size);
  return <LinearGradient colors={['#FFB88A','#FF8A6B',colors.child.plum]} locations={[0,.45,1]} style={styles.root}>
    <View style={styles.glowOuter}><View style={styles.glowInner}><View style={styles.moon}><Txt size={48}>🌙</Txt></View></View></View>
    <Txt weight="black" size={28} color="#fff" center style={styles.title}>All done for today, {p?.nickname ?? 'friend'}!</Txt>
    <Txt weight="bold" size={14.5} color="rgba(255,255,255,.92)" center style={styles.body}>The videos will be waiting for you tomorrow. Sweet dreams!</Txt>
    <View style={styles.stats}>
      <View style={styles.stat}><Txt weight="black" size={20} color="#fff">{Math.max(1, Math.floor(seconds / 60))} min</Txt><Txt weight="bold" size={10.5} color="rgba(255,255,255,.85)">watched today</Txt></View>
      <View style={styles.stat}><Txt weight="black" size={20} color="#fff">{Math.max(1, videosToday)}</Txt><Txt weight="bold" size={10.5} color="rgba(255,255,255,.85)">{videosToday === 1 ? 'video enjoyed' : 'videos enjoyed'}</Txt></View>
    </View>
    <Txt weight="bold" size={12.5} color="rgba(255,255,255,.75)" style={styles.parentOnly}>🔒 Grown-ups can add more time</Txt>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  root:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:32,gap:16},
  glowOuter:{padding:16,borderRadius:999,backgroundColor:'rgba(255,248,236,.1)'},
  glowInner:{padding:16,borderRadius:999,backgroundColor:'rgba(255,248,236,.22)'},
  moon:{width:104,height:104,borderRadius:52,backgroundColor:colors.child.cream,alignItems:'center',justifyContent:'center'},
  title:{maxWidth:260},
  body:{lineHeight:22,maxWidth:240},
  stats:{flexDirection:'row',gap:10},
  stat:{backgroundColor:'rgba(255,255,255,.18)',borderRadius:14,paddingVertical:9,paddingHorizontal:16,alignItems:'center',gap:1},
  parentOnly:{marginTop:8},
});

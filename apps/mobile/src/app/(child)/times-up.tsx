import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon, Appear, Breathe, ChildAvatar, Float, LockGlyph, PopIn, PressableScale, SchoolTimeArt, Twinkle, Txt } from '@/components';
import { colors, controls, exactType, shadows } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAppStore, useChildRules, useWatchBlock } from '@/stores/appStore';
import { schoolEndLabel } from '@/lib/schoolTime';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { remainingSeconds, useSecondsWatchedToday, useTimerStore } from '@/stores/timerStore';

function isToday(iso: string) { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }

const GRADIENTS = {
  done: ['#FFD9C2', '#FFEDE0', colors.child.cream],
  bedtime: colors.nightGrad,
  school: ['#BFE6F5', '#E4F4FA', colors.child.cream],
} as const;

/**
 * The break screen: daily limit reached, bedtime, or school hours.
 *
 * The child has no way forward from here — but the parent must. The only exit is
 * PIN-gated, so the promise of "grown-ups can add more time" is real rather than a
 * label: without it the phone is stuck on this screen until the app is killed.
 */
export default function TimesUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // iPad: the same screen drawn bigger (design 09/10/10b).
  const { isTablet: big } = useResponsiveLayout();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const bedtime = reason === 'bedtime';
  const p = useAppStore(s => s.childProfiles.find(x => x.id === s.activeChildProfileId) ?? s.childProfiles[0]);
  const seconds = useSecondsWatchedToday(p?.id ?? null);
  const videosToday = useTimerStore(s => new Set(s.sessions.filter(x => x.childProfileId === p?.id && isToday(x.startedAt)).flatMap(x => x.videoIds)).size);
  // On a kid device the grown-up changes limits from their own phone. When a
  // sync brings more time (or a new day), go straight back to the videos.
  const kidDevice = useKidDeviceStore(s => s.paired);
  const watchBlock = useWatchBlock(p?.id ?? null);
  const rules = useChildRules(p?.id ?? null);
  const remaining = remainingSeconds(p?.dailyLimitMinutes, seconds);
  const canWatchAgain = !watchBlock && (remaining === null || remaining > 0);
  // School hours end on their own, on any device: the child is back to their
  // videos when the bell rings, without a grown-up having to unlock anything.
  const autoReturn = kidDevice || reason === 'school_time';
  // If the bell rang but today's minutes are already spent, this becomes the
  // ordinary "all done" screen rather than promising videos that won't come.
  const school = watchBlock === 'school_time' || (reason === 'school_time' && canWatchAgain);
  useEffect(() => {
    if (!autoReturn || !canWatchAgain || !p) return;
    // The last session closed at the limit; count the new watch time in a new one.
    const timer = useTimerStore.getState();
    if (!timer.activeSessionId) timer.startSession(p.id);
    router.replace('/(child)');
  }, [autoReturn, canWatchAgain, p, router]);
  const name = p?.nickname ?? 'friend';
  const mode: 'school' | 'bedtime' | 'done' = school ? 'school' : bedtime ? 'bedtime' : 'done';
  const night = mode === 'bedtime';
  const ink = night ? '#FFFFFF' : colors.parent.night;
  const title = mode === 'school' ? `It's school time, ${name}!` : mode === 'bedtime' ? `It's bedtime, ${name}!` : `All done for today, ${name}!`;
  const body = mode === 'school'
    ? 'Have a great day learning. Your videos will be here after school.'
    : 'The videos will be waiting for you tomorrow. Sweet dreams!';
  const grownupsLabel = kidDevice || mode !== 'done' ? 'Grown-ups' : 'Grown-ups can add more time';
  return <LinearGradient colors={GRADIENTS[mode]} locations={[0, .55, 1]} style={{ flex: 1 }}>
    <StatusBar style={night ? 'light' : 'dark'} />
    {night ? <>
      <Twinkle size={6} delay={0} style={{ top: insets.top + 70, left: 60 }} />
      <Twinkle size={4} delay={600} style={{ top: insets.top + 120, right: 70 }} />
      <Twinkle size={3} delay={1100} style={{ top: insets.top + 190, left: 110 }} />
      <Twinkle size={5} delay={300} style={{ top: insets.top + 46, right: 130 }} />
      <Twinkle size={4} delay={1500} style={{ top: insets.top + 260, right: 40 }} />
    </> : null}
    <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 96 }]}>
      <Appear index={0}>
        {mode === 'school' ? <View style={[styles.halo, big && styles.haloBig]}><View style={[styles.disc, styles.discSchool, big && styles.discBig]}><SchoolTimeArt width={big ? 190 : 150} /></View></View>
          : mode === 'bedtime' ? <View style={[styles.nightOuter, big && styles.nightOuterBig]}>
            <View style={[styles.nightInner, big && styles.nightInnerBig]}><Float distance={5} sway={2} duration={2600}><ChildAvatar avatar={p?.avatar ?? 'fox'} size={big ? 148 : 118} /></Float></View>
            <Breathe from={0.96} to={1.04} duration={2400} style={styles.moon}><View style={[styles.moonFace, big && styles.moonBig]}><View style={[styles.moonBite, big && styles.moonBiteBig]} /></View></Breathe>
          </View>
          : <View style={[styles.halo, big && styles.haloBig]}><View style={[styles.disc, big && styles.discBig]}><PopIn wiggleEvery={3200}><ChildAvatar avatar="star" size={big ? 164 : 130} /></PopIn></View></View>}
      </Appear>
      <Appear index={1}><Txt weight="black" size={big ? exactType(44) : 30} lineHeight={big ? exactType(50) : 35} color={ink} center style={big ? styles.titleBig : styles.title}>{title}</Txt></Appear>
      <Appear index={2}><Txt weight="bold" size={big ? exactType(19) : 15.5} lineHeight={big ? exactType(28) : 23} color={night ? 'rgba(255,255,255,.9)' : '#4A5670'} center style={big ? styles.bodyBig : styles.body}>{body}</Txt></Appear>
      {night ? null : <Appear index={3} style={[styles.backCard, big && styles.backCardBig]}>
        <AppIcon name="time" size={30} style={{ borderRadius: 9 }} />
        <View>
          <Txt weight="bold" size={12} color={colors.parent.muted}>{mode === 'school' ? 'Videos are back at' : 'Videos are back'}</Txt>
          <Txt weight="black" size={20} color={mode === 'school' ? colors.child.skyDeep : colors.child.coral}>{mode === 'school' ? schoolEndLabel(rules) : 'Tomorrow'}</Txt>
        </View>
      </Appear>}
      {mode === 'done' ? <Appear index={4}><Txt weight="bold" size={13} color={colors.parent.muted} center>
        {Math.max(1, Math.floor(seconds / 60))} min · {Math.max(1, videosToday)} {videosToday === 1 ? 'video' : 'videos'} today
      </Txt></Appear> : null}
    </ScrollView>
    <Appear index={5} style={[styles.footer, { bottom: insets.bottom + 28 }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={kidDevice ? 'Grown-ups' : `${grownupsLabel} — enter PIN`}
        onPress={() => router.push(kidDevice ? '/kid-sign-out' : '/pin-unlock')}
        style={[styles.parentOnly, big && styles.parentOnlyBig, { backgroundColor: night ? 'rgba(255,255,255,.14)' : 'rgba(42,59,92,.08)' }]}
      >
        <LockGlyph color={ink} scale={0.66} />
        <Txt weight="extrabold" size={13} color={ink}>{grownupsLabel}</Txt>
      </PressableScale>
    </Appear>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  root:{flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:32,gap:18},
  halo:{padding:20,borderRadius:999,backgroundColor:'rgba(255,255,255,.4)'},
  disc:{width:190,height:190,borderRadius:95,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',shadowColor:colors.child.coral,shadowOffset:{width:0,height:8},shadowOpacity:.14,shadowRadius:24,elevation:4},
  discSchool:{shadowColor:colors.child.skyDeep,overflow:'hidden'},
  nightOuter:{width:200,height:200,borderRadius:100,backgroundColor:'rgba(255,243,217,.08)',alignItems:'center',justifyContent:'center'},
  nightInner:{width:150,height:150,borderRadius:75,backgroundColor:'rgba(255,243,217,.14)',alignItems:'center',justifyContent:'center'},
  moon:{position:'absolute',top:0,right:4},
  moonFace:{width:52,height:52,borderRadius:26,backgroundColor:'#FFE7A8',overflow:'hidden'},
  moonBite:{position:'absolute',top:-8,left:-14,width:52,height:52,borderRadius:26,backgroundColor:'#2C3C63'},
  title:{maxWidth:300},
  haloBig:{padding:24},
  discBig:{width:240,height:240,borderRadius:120},
  nightOuterBig:{width:250,height:250,borderRadius:125},
  nightInnerBig:{width:188,height:188,borderRadius:94},
  moonBig:{width:64,height:64,borderRadius:32},
  moonBiteBig:{top:-10,left:-17,width:64,height:64,borderRadius:32},
  titleBig:{maxWidth:560},
  bodyBig:{maxWidth:420},
  backCardBig:{gap:12,borderRadius:22,paddingVertical:14,paddingHorizontal:24},
  parentOnlyBig:{minHeight:48,paddingHorizontal:20,borderRadius:24},
  body:{maxWidth:280},
  backCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFFFF',borderRadius:20,paddingVertical:12,paddingHorizontal:20,...shadows.card},
  footer:{position:'absolute',left:0,right:0,alignItems:'center'},
  parentOnly:{minHeight:controls.minTouchParent,paddingHorizontal:18,borderRadius:22,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
});

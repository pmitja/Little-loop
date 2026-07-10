import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Button, StatusBadge, Txt } from '@/components';
import { colors, controls, shadows } from '@/theme/tokens';
import { FREE_LIMITS, formatDuration } from '@littleloop/shared';
import { useAppStore } from '@/stores/appStore';
import { useLivePlaylistVideos, usePlaylistStore, usePlaylistVideos } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { useLockStore } from '@/stores/lockStore';
import { useTimerStore } from '@/stores/timerStore';

export default function Playlist() {
  const router = useRouter(); const profile = useAppStore(s => s.childProfiles.find(p => p.id === s.activeChildProfileId) ?? s.childProfiles[0] ?? null);
  const videos = usePlaylistVideos(profile?.id ?? null); const premium = usePremium(); const remove = usePlaylistStore(s => s.removeVideo);
  const liveVideos = useLivePlaylistVideos(profile?.id ?? null);
  const reviewCount = videos.filter(v => v.status === 'review').length; const name = profile?.nickname ?? 'Your child';
  const goPaste = () => { if (!premium && videos.length >= FREE_LIMITS.videosPerPlaylist) router.push({ pathname: '/paywall', params: { trigger: 'playlist-cap', child: name } }); else router.push('/(parent)/add-video'); };
  const startChildMode = () => {
    if (!profile || liveVideos.length === 0) return;
    useAppStore.getState().setActiveChildProfileId(profile.id);
    useTimerStore.getState().startSession(profile.id);
    useLockStore.getState().setChildMode(true);
    router.replace('/(child)');
  };
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Txt weight="black" size={24}>{name}’s playlist</Txt><Txt weight="bold" size={13} color={colors.parent.muted}>{premium ? `${videos.length} ${videos.length === 1 ? 'video' : 'videos'} · Premium` : `${videos.length} of ${FREE_LIMITS.videosPerPlaylist} videos · Free`}</Txt></View>
    <Pressable onPress={goPaste} style={styles.paste}><Txt weight="black" size={20} color={colors.child.skyDeep}>＋</Txt><Txt weight="bold" size={14} color={colors.parent.muted}>Paste a YouTube link…</Txt></Pressable>
    {reviewCount ? <Txt weight="black" size={15} style={{marginTop:4}}>Waiting for review ({reviewCount})</Txt> : null}
    <View style={styles.list}>{videos.map(entry => <Pressable key={entry.id} onPress={() => entry.status === 'review' ? router.push({ pathname: '/(parent)/review-video', params: { video: JSON.stringify(entry.video), entryId: entry.id } }) : undefined} style={styles.row}><Image source={{uri:entry.video.thumbnailUrl}} style={styles.thumb}/><View style={styles.copy}><Txt weight="bold" size={14} numberOfLines={1}>{entry.video.title}</Txt><Txt size={12} color={colors.parent.muted}>{entry.video.durationSeconds ? formatDuration(entry.video.durationSeconds) : 'Video'} · added {new Date(entry.addedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</Txt></View><StatusBadge state={(entry.status ?? 'live').toUpperCase() as 'LIVE' | 'REVIEW'}/><Pressable accessibilityLabel={`Remove ${entry.video.title}`} onPress={() => profile && remove(profile.id, entry.id)} style={styles.remove}><Txt size={16} color={colors.parent.muted}>×</Txt></Pressable></Pressable>)}</View>
    <Button title="Start Child Mode" variant="outline" size="md" onPress={startChildMode} disabled={!profile || liveVideos.length === 0}/>
  </ScrollView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.parent.paper},content:{paddingTop:58,paddingHorizontal:24,paddingBottom:120,gap:14},header:{gap:4},paste:{height:58,borderWidth:2,borderStyle:'dashed',borderColor:colors.child.skyDeep,borderRadius:16,backgroundColor:'#fff',paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:10},list:{gap:9},row:{minHeight:72,padding:8,backgroundColor:'#fff',borderRadius:16,flexDirection:'row',alignItems:'center',gap:9,...shadows.card},thumb:{width:66,height:48,borderRadius:10,backgroundColor:'#EAF6FA'},copy:{flex:1,minWidth:0,gap:3},remove:{width:controls.minTouchParent,height:controls.minTouchParent,alignItems:'center',justifyContent:'center'}});

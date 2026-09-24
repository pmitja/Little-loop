import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { extractYouTubeIdFromText, youtubeWatchUrl } from '@littleloop/shared';
import { Button, ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { VIDEO_ERROR_MESSAGES } from '@/lib/videos';
import { useAppStore } from '@/stores/appStore';
import { AddVideoSheet } from '@/features/videos/AddVideoSheet';

/**
 * Share target: a YouTube link handed over from another app's share sheet.
 *
 * Entry from the system share sheet is routed through the parent PIN before
 * this screen becomes visible, so it is the same Add video sheet a parent opens
 * in the app — with the shared link already filled in and previewing.
 */
export default function ShareVideo() {
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const hasChild = useAppStore((s) => s.childProfiles.length > 0);

  // Read the shared link once: the intent is reset as we leave, and the sheet
  // must not flip to "no link" while it slides away.
  const [start] = useState(() => {
    const shared = shareIntent.webUrl ?? shareIntent.text ?? null;
    if (!shared) return { link: '', error: 'That share didn’t include a link.' };
    const videoId = extractYouTubeIdFromText(shared);
    if (!videoId) return { link: '', error: VIDEO_ERROR_MESSAGES.INVALID_LINK };
    return { link: youtubeWatchUrl(videoId), error: null };
  });

  // A share launch may be the root of the navigation stack, so GO_BACK is not
  // reliable. Finish inside LittleLoop on the playlist that received the video.
  const close = useCallback(() => {
    // Dismiss the share sheet when it sits on a stack; a bare replace would
    // render the playlist inside the modal.
    if (router.canDismiss()) router.dismissTo('/(parent)/(tabs)/playlist');
    else router.replace('/(parent)/(tabs)/playlist');
    resetShareIntent();
  }, [resetShareIntent, router]);

  // Shared into an account that has no child yet — onboarding, not a playlist.
  if (!hasChild) {
    return (
      <ScreenContainer style={styles.root}>
        <ParentHeader title="Add to LittleLoop" onClose={close} />
        <View style={styles.centered}>
          <Txt weight="black" size={19} center>
            Add a child first
          </Txt>
          <Txt weight="semibold" size={14} color={colors.muted} center style={styles.copy}>
            Videos go into a child’s playlist, so LittleLoop needs a profile before it can keep this one.
          </Txt>
          <Button title="Finish setting up" onPress={close} style={styles.cta} />
        </View>
      </ScreenContainer>
    );
  }

  return <AddVideoSheet initialLink={start.link} initialError={start.error} onClosed={close} onChannelApproved={resetShareIntent} />;
}

const styles = StyleSheet.create({
  root: { paddingTop: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  copy: { marginTop: 8, lineHeight: 20 },
  cta: { alignSelf: 'stretch', marginTop: 20 },
});

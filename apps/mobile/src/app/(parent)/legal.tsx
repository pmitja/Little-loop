import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FREE_LIMITS } from '@littleloop/shared';
import { ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';

interface Section {
  heading: string;
  body: string;
}

const PRIVACY: Section[] = [
  {
    heading: 'What we collect',
    body: 'A parent account (email, via Google or Apple sign-in — with Apple’s “Hide My Email” we only receive the relay address) and the content you create: child profile nicknames, avatars, time-limit settings, and approved video links. With Premium family sharing, invited caregivers can access the family’s profiles, playlists, settings, and watch activity, and family members can see each other’s account email.',
  },
  {
    heading: 'What stays on this device',
    body: 'Your Parent PIN (stored only as a salted hash in the device keychain — we never see it) and, on the free plan, all watch activity: sessions, daily totals, and most-watched stats never leave this phone.',
  },
  {
    heading: 'Children',
    body: 'LittleLoop is operated for parents. Child mode collects no personal information from children, shows no ads of our own, has no search, no comments, and no links out. Videos play through YouTube’s embedded player under its privacy-enhanced (youtube-nocookie) mode.',
  },
  {
    heading: 'Third parties',
    body: 'Google and Apple (sign-in), RevenueCat (subscriptions), Sentry (crash reports, no personal data attached), and YouTube (video playback and thumbnails). We do not sell data and we do not use third-party advertising.',
  },
  {
    heading: 'Deleting your data',
    body: 'For the main caregiver, Settings → Delete account & data removes the entire family. For an invited caregiver, it removes only their account and access; the family remains. You can also email support@littleloopapp.com.',
  },
];

const TERMS: Section[] = [
  {
    heading: 'The service',
    body: 'LittleLoop lets parents build playlists of videos they have personally reviewed and hand the phone to a child in a locked mode. You are responsible for reviewing videos before approving them.',
  },
  {
    heading: 'Video content',
    body: 'Videos play through the official YouTube embedded player and remain subject to YouTube’s terms. They may include ads served by the video platform. YouTube is a trademark of Google LLC; LittleLoop is not affiliated with or endorsed by Google.',
  },
  {
    heading: 'Subscriptions',
    body: `LittleLoop Premium renews automatically through your App Store or Google Play account until cancelled there. The free plan includes 1 child profile, 1 playlist, and up to ${FREE_LIMITS.videosPerPlaylist} approved videos.`,
  },
  {
    heading: 'Limits of the lock',
    body: 'Child mode locks LittleLoop itself. It cannot lock the rest of the phone — for that, use iOS Guided Access or Android app pinning as suggested in the app.',
  },
];

/** Static privacy policy / terms (Phase 5); the canonical copies live in docs/. */
export default function Legal() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isTerms = doc === 'terms';
  const sections = isTerms ? TERMS : PRIVACY;

  return (
    <ScreenContainer scroll style={styles.container}>
      <ParentHeader title={isTerms ? 'Terms of use' : 'Privacy policy'} onBack={() => router.back()} />
      <Txt weight="semibold" size={12.5} color={colors.subtle} style={{ marginTop: 12 }}>
        Last updated July 15, 2026
      </Txt>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Txt weight="extrabold" size={15}>
            {s.heading}
          </Txt>
          <Txt weight="semibold" size={13.5} color={colors.muted} lineHeight={20.25} style={{ marginTop: 6 }}>
            {s.body}
          </Txt>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16, paddingBottom: 24 },
  section: { marginTop: 18 },
});

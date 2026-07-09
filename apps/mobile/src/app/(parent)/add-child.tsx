import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { FREE_LIMITS } from '@littleloop/shared';
import { Card, ChildAvatar, ParentHeader, ScreenContainer, Txt } from '@/components';
import { colors } from '@/theme/tokens';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePremium } from '@/stores/entitlementStore';
import { ChildProfileForm } from '@/features/family/ChildProfileForm';

function CheckBadge() {
  return (
    <View style={styles.checkBadge}>
      <Svg width={9} height={7} viewBox="0 0 9 7">
        <Path
          d="M1 3.5 L3.2 5.7 L8 1"
          stroke={colors.green}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function PremiumNote() {
  return (
    <View style={styles.note}>
      <View style={styles.noteStar}>
        <Txt size={13} color="#FFE9A8">
          ★
        </Txt>
      </View>
      <Txt weight="bold" size={12.5} color={colors.primaryDark} style={{ flex: 1 }} lineHeight={18}>
        Each child gets their own playlist and time limit. Included with Premium.
      </Txt>
    </View>
  );
}

/** s22 — add another child: existing profiles recap + creation form (Premium). */
export default function AddChild() {
  const router = useRouter();
  const profiles = useAppStore((s) => s.childProfiles);
  const videosByChild = usePlaylistStore((s) => s.videosByChild);
  const premium = usePremium();

  // Free plan allows one profile — landing here past the limit goes to the paywall (s19).
  if (!premium && profiles.length >= FREE_LIMITS.childProfiles) {
    return <Redirect href="/paywall" />;
  }

  return (
    <ScreenContainer scroll style={styles.container}>
      <ParentHeader title="Add another child" onBack={() => router.back()} />
      <View style={{ height: 16 }} />

      {profiles.map((profile) => {
        const count = (videosByChild[profile.id] ?? []).length;
        return (
          <Card key={profile.id} radius={20} style={styles.existingRow}>
            <ChildAvatar avatar={profile.avatar} size={36} />
            <View style={{ flex: 1 }}>
              <Txt weight="extrabold" size={14}>
                {profile.nickname}
              </Txt>
              <Txt weight="semibold" size={11.5} color={colors.subtle}>
                Existing profile · {count} {count === 1 ? 'video' : 'videos'}
              </Txt>
            </View>
            <CheckBadge />
          </Card>
        );
      })}
      <View style={{ height: 20 }} />

      <ChildProfileForm
        showLimitRow={false}
        footer={<PremiumNote />}
        onCreated={() => router.back()}
        onLimitReached={() => router.replace('/paywall')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  noteStar: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

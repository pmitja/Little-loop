import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FREE_LIMITS } from '@littleloop/shared';
import {
  Appear,
  ChildAvatar,
  Float,
  ParentHeader,
  PressableScale,
  ScreenContainer,
  Txt,
  usePane,
} from '@/components';
import { fetchFamily } from '@/features/family/familyApi';
import { CHILD_DEVICES_QUERY_KEY, fetchChildDevices, lastSeenLabel } from '@/features/kid/childDevicesApi';
import { KidDevicesArt } from '@/features/kid/KidDevicesArt';
import { useParentIdentity } from '@/lib/auth';
import { useAppStore } from '@/stores/appStore';
import { usePremium } from '@/stores/entitlementStore';
import { colors, shadows } from '@/theme/tokens';
import { KID_TINTS } from '@/theme/kid';

/** A device seen in the last few minutes is treated as on right now. */
const ONLINE_MS = 5 * 60 * 1000;

function Chevron() {
  return <Txt weight="black" size={20} color={colors.subtle}>›</Txt>;
}

function AddRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} pressedScale={0.98} style={styles.row}>
      <View style={styles.addCircle}>
        <Txt weight="black" size={20} color={colors.child.skyDeep}>+</Txt>
      </View>
      <View style={styles.copy}>
        <Txt weight="extrabold" size={15} color={colors.child.skyDeep}>{label}</Txt>
        {hint ? <Txt weight="bold" size={12} color={colors.parent.muted}>{hint}</Txt> : null}
      </View>
    </PressableScale>
  );
}

/**
 * Family: every screen the children watch on and every grown-up who helps,
 * on one page. Management of each lives one tap deeper.
 */
export default function Family() {
  const router = useRouter();
  const pane = usePane();
  const premium = usePremium();
  const identity = useParentIdentity();
  const profiles = useAppStore((s) => s.childProfiles);
  const devices = useQuery({ queryKey: CHILD_DEVICES_QUERY_KEY, queryFn: fetchChildDevices });
  const family = useQuery({ queryKey: ['family'], queryFn: fetchFamily });
  const deviceCount = devices.data?.length ?? 0;
  const deviceCap = premium ? null : FREE_LIMITS.kidDevices;
  const isOwner = family.data?.role !== 'caregiver';

  const pairDevice = () =>
    !premium && deviceCount >= FREE_LIMITS.kidDevices
      ? router.push({ pathname: '/paywall', params: { trigger: 'kid-devices' } })
      : router.push('/(parent)/pair-kid-device');

  return (
    <ScreenContainer scroll style={styles.root}>
      {pane.inPane ? (
        // In the iPad pane the art sits beside the title instead of above the lists.
        <Appear index={0} style={styles.paneHead}>
          <View style={{ flex: 1 }}>
            <ParentHeader title="Family" onBack={pane.canGoBack ? pane.back : undefined} />
          </View>
          <KidDevicesArt width={120} />
        </Appear>
      ) : (
        <>
          <Appear index={0}>
            <ParentHeader title="Family" onBack={pane.canGoBack ? pane.back : undefined} />
          </Appear>
          <Appear index={1} style={styles.art}>
            <Float distance={6} sway={1.5} duration={2600}>
              <KidDevicesArt width={170} />
            </Float>
          </Appear>
        </>
      )}

      <Appear index={2} style={styles.sectionHead}>
        <Txt weight="black" size={17}>Kid devices</Txt>
        {deviceCap !== null ? (
          <Txt weight="extrabold" size={12} color={colors.parent.muted}>{deviceCount} of {deviceCap} on Free</Txt>
        ) : null}
      </Appear>
      <Appear index={3} style={styles.group}>
        {devices.isPending ? (
          <View style={styles.loading}><ActivityIndicator color={colors.child.skyDeep} /></View>
        ) : (
          (devices.data ?? []).map((device) => {
            const child = profiles.find((p) => p.id === device.childProfileId);
            const online = Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_MS;
            return (
              <PressableScale
                key={device.id}
                accessibilityRole="button"
                accessibilityLabel={`${device.name}, manage`}
                onPress={() => pane.open('kid-devices')}
                pressedScale={0.98}
                style={[styles.row, styles.divider]}
              >
                <View style={[styles.avatar, { backgroundColor: child ? KID_TINTS[child.avatar] : colors.primaryTint }]}>
                  {child ? <ChildAvatar avatar={child.avatar} size={32} /> : null}
                </View>
                <View style={styles.copy}>
                  <Txt weight="extrabold" size={15} numberOfLines={1}>{device.name}</Txt>
                  <View style={styles.status}>
                    <View style={[styles.dot, { backgroundColor: online ? colors.green : '#C9C2B7' }]} />
                    <Txt weight="bold" size={12} color={online ? colors.greenDark : colors.parent.muted} numberOfLines={1}>
                      {child ? `${child.nickname} · ` : ''}{online ? 'on now' : lastSeenLabel(device.lastSeenAt)}
                    </Txt>
                  </View>
                </View>
                <Chevron />
              </PressableScale>
            );
          })
        )}
        <AddRow label="Pair a kid device" hint="Scan a code on the child’s phone or tablet" onPress={pairDevice} />
      </Appear>

      <Appear index={4} style={styles.sectionHead}>
        <Txt weight="black" size={17}>Caregivers</Txt>
      </Appear>
      <Appear index={5} style={styles.group}>
        {family.isPending ? (
          <View style={styles.loading}><ActivityIndicator color={colors.child.skyDeep} /></View>
        ) : family.data ? (
          family.data.members.map((member, i) => {
            const you = member.email === identity.email;
            return (
              <PressableScale
                key={member.id}
                accessibilityRole="button"
                accessibilityLabel={`${member.name}, ${member.role === 'owner' ? 'main caregiver' : 'caregiver'}`}
                onPress={() => pane.open('caregivers')}
                pressedScale={0.98}
                style={[styles.row, styles.divider]}
              >
                <View style={[styles.avatar, { backgroundColor: i === 0 ? colors.parent.night : colors.child.plum }]}>
                  <Txt weight="black" size={16} color="#FFFFFF">{(member.name || member.email)[0]?.toUpperCase()}</Txt>
                </View>
                <View style={styles.copy}>
                  <Txt weight="extrabold" size={15} numberOfLines={1}>{member.name || member.email}{you ? ' (you)' : ''}</Txt>
                  <Txt weight="bold" size={12} color={colors.parent.muted}>
                    {member.role === 'owner' ? 'Main caregiver' : 'Can add videos and time'}
                  </Txt>
                </View>
                {member.role === 'caregiver' && isOwner ? <Chevron /> : null}
              </PressableScale>
            );
          })
        ) : (
          <View style={[styles.row, styles.divider]}>
            <Txt weight="bold" size={13} color={colors.parent.muted}>We couldn’t load your family right now.</Txt>
          </View>
        )}
        {isOwner ? (
          <AddRow
            label={premium ? 'Invite a caregiver' : 'Unlock caregiver sharing'}
            onPress={() =>
              premium
                ? pane.open('caregivers')
                : router.push({ pathname: '/paywall', params: { trigger: 'settings' } })
            }
          />
        ) : null}
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 14 },
  art: { alignItems: 'center' },
  paneHead: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  group: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, ...shadows.card },
  loading: { paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F0EBE1' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.child.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

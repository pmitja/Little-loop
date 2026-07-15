import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button, ParentHeader, ScreenContainer, SectionLabel, SettingsGroup, SettingsRow, showAppAlert, Txt } from '@/components';
import {
  createFamilyInvite,
  fetchFamily,
  removeFamilyMember,
  revokeFamilyInvite,
} from '@/features/family/familyApi';
import { InviteShareModal } from '@/features/family/InviteShareModal';
import { usePremium } from '@/stores/entitlementStore';
import { colors } from '@/theme/tokens';

const FAMILY_QUERY_KEY = ['family'] as const;

export default function Caregivers() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const premium = usePremium();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const family = useQuery({ queryKey: FAMILY_QUERY_KEY, queryFn: fetchFamily });
  const isOwner = family.data?.role === 'owner';
  const refresh = () => queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
  const removeMember = useMutation({ mutationFn: removeFamilyMember, onSuccess: refresh });
  const revokeInvite = useMutation({ mutationFn: revokeFamilyInvite, onSuccess: refresh });
  const invite = useMutation({
    mutationFn: createFamilyInvite,
    onSuccess: (created) => {
      refresh();
      setInviteToken(created.token);
    },
    onError: () => showAppAlert('Couldn’t create invitation', 'Please check your connection and try again.'),
  });

  const confirmRemove = (id: string, name: string) => {
    showAppAlert(
      `Remove ${name}?`,
      'They will immediately lose access to the children, playlists, and activity in this family.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMember.mutate(id) },
      ],
    );
  };

  return (
    <ScreenContainer scroll style={styles.root}>
      <ParentHeader title="Caregivers" onBack={() => router.back()} />
      <Txt size={13.5} color={colors.muted} lineHeight={20}>
        Caregivers can manage profiles, time limits, and approved videos. Only the main caregiver can delete profiles, invite people, or manage billing.
      </Txt>

      <SectionLabel>Family access</SectionLabel>
      {family.isPending ? (
        <View style={styles.note}>
          <ActivityIndicator color={colors.primary} />
          <Txt weight="bold" size={13} color={colors.muted} center>
            Loading family access…
          </Txt>
        </View>
      ) : family.isError ? (
        <View style={styles.note}>
          <Txt weight="bold" size={13} color={colors.red} center>
            We couldn’t load your family access.
          </Txt>
          <Button title="Try again" size="md" variant="outline" onPress={() => void family.refetch()} />
        </View>
      ) : (
        <SettingsGroup>
        {family.data.members.map((member) => (
          <SettingsRow
            key={member.id}
            icon="👤"
            iconBg={colors.primaryTint}
            title={member.email}
            value={member.role === 'owner' ? 'Main' : 'Caregiver'}
            chevron={isOwner && member.role === 'caregiver'}
            onPress={
              isOwner && member.role === 'caregiver'
                ? () => confirmRemove(member.id, member.name)
                : undefined
            }
          />
        ))}
        </SettingsGroup>
      )}

      {isOwner && family.data?.pendingInvites.length ? (
        <>
          <SectionLabel>Pending invitations</SectionLabel>
          <SettingsGroup>
            {family.data.pendingInvites.map((pending) => (
              <SettingsRow
                key={pending.id}
                icon="✉️"
                iconBg={colors.primaryTint}
                title="Invitation pending"
                value="Revoke"
                chevron
                onPress={() => revokeInvite.mutate(pending.id)}
              />
            ))}
          </SettingsGroup>
        </>
      ) : null}

      {family.data && isOwner ? (
        premium ? (
          <Button
            title="Invite a caregiver"
            onPress={() => invite.mutate()}
            loading={invite.isPending}
          />
        ) : (
          <Button
            title="Unlock caregiver sharing"
            onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
          />
        )
      ) : family.data ? (
        <View style={styles.note}>
          <Txt weight="bold" size={13} color={colors.muted} center>
            The main caregiver manages invitations and billing.
          </Txt>
        </View>
      ) : null}
      <InviteShareModal token={inviteToken} onClose={() => setInviteToken(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  note: { padding: 16, backgroundColor: colors.card, borderRadius: 14 },
});

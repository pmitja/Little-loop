import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Button,
  ChildAvatar,
  ParentHeader,
  ScreenContainer,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
  showAppAlert,
  Txt,
} from '@/components';
import { FREE_LIMITS } from '@littleloop/shared';
import { ApiError } from '@/lib/api';
import { usePremium } from '@/stores/entitlementStore';
import { useAppStore } from '@/stores/appStore';
import {
  CHILD_DEVICES_QUERY_KEY,
  fetchChildDevices,
  lastSeenLabel,
  unpairChildDevice,
  updateChildDevice,
  type ChildDevice,
} from '@/features/kid/childDevicesApi';
import { KidDevicesArt } from '@/features/kid/KidDevicesArt';
import { colors, shadows } from '@/theme/tokens';

/** Settings → Kid devices: the child's own phones/tablets and their controls. */
export default function KidDevices() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profiles = useAppStore((s) => s.childProfiles);
  const premium = usePremium();
  const [renaming, setRenaming] = useState<ChildDevice | null>(null);
  const devices = useQuery({ queryKey: CHILD_DEVICES_QUERY_KEY, queryFn: fetchChildDevices });
  const refresh = () => queryClient.invalidateQueries({ queryKey: CHILD_DEVICES_QUERY_KEY });

  const unpair = useMutation({
    mutationFn: unpairChildDevice,
    onSuccess: refresh,
    onError: () => showAppAlert('Couldn’t unpair', 'Please check your connection and try again.'),
  });
  const move = useMutation({
    mutationFn: ({ id, childProfileId }: { id: string; childProfileId: string }) =>
      updateChildDevice(id, { childProfileId }),
    onSuccess: refresh,
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'PREMIUM_REQUIRED') {
        router.push({ pathname: '/paywall', params: { trigger: 'settings' } });
        return;
      }
      showAppAlert('Couldn’t change child', 'Please check your connection and try again.');
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateChildDevice(id, { name }),
    onSuccess: () => {
      setRenaming(null);
      void refresh();
    },
    onError: () => showAppAlert('Couldn’t rename', 'Please check your connection and try again.'),
  });

  const childOf = (device: ChildDevice) => profiles.find((p) => p.id === device.childProfileId);

  const manage = (device: ChildDevice) => {
    const others = profiles.filter((p) => p.id !== device.childProfileId);
    showAppAlert(device.name, `Plays ${childOf(device)?.nickname ?? 'your child'}’s videos.`, [
      ...others.map((child) => ({
        text: `Switch to ${child.nickname}`,
        onPress: () => move.mutate({ id: device.id, childProfileId: child.id }),
      })),
      { text: 'Rename', onPress: () => setRenaming(device) },
      {
        text: 'Unpair device',
        style: 'destructive' as const,
        onPress: () => confirmUnpair(device),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const confirmUnpair = (device: ChildDevice) => {
    showAppAlert(
      `Unpair ${device.name}?`,
      'It will stop playing videos within a minute and go back to its setup screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpair', style: 'destructive', onPress: () => unpair.mutate(device.id) },
      ],
    );
  };

  return (
    <ScreenContainer scroll style={styles.root}>
      <ParentHeader title="Kid devices" onBack={() => router.back()} />
      <Txt size={13.5} color={colors.muted} lineHeight={20}>
        Give your child their own phone or tablet. It only plays the videos you approve, shares
        the same daily limit, and has no settings on it. Everything is managed from here. New
        videos appear on it within a few minutes — pull down on its video list to refresh now.
      </Txt>

      <SectionLabel>Paired devices</SectionLabel>
      {devices.isPending ? (
        <View style={styles.note}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : devices.isError ? (
        <View style={styles.note}>
          <Txt weight="bold" size={13} color={colors.red} center>
            We couldn’t load your kid devices.
          </Txt>
          <Button title="Try again" size="md" variant="outline" onPress={() => void devices.refetch()} />
        </View>
      ) : devices.data.length === 0 ? (
        <View style={styles.note}>
          <KidDevicesArt width={220} />
          <Txt weight="bold" size={13} color={colors.muted} center>
            No kid devices yet.
          </Txt>
        </View>
      ) : (
        <SettingsGroup>
          {devices.data.map((device) => {
            const child = childOf(device);
            return (
              <SettingsRow
                key={device.id}
                icon={child ? <ChildAvatar avatar={child.avatar} size={30} /> : '📱'}
                iconBg="transparent"
                title={`${device.name}${child ? ` · ${child.nickname}` : ''}`}
                value={lastSeenLabel(device.lastSeenAt)}
                chevron
                onPress={() => manage(device)}
              />
            );
          })}
        </SettingsGroup>
      )}

      <Button
        title="Add a kid device"
        onPress={() =>
          // Free plan: one kid device. Checked here so the parent doesn't set up
          // the child's device first; the server enforces it either way.
          !premium && (devices.data?.length ?? 0) >= FREE_LIMITS.kidDevices
            ? router.push({ pathname: '/paywall', params: { trigger: 'kid-devices' } })
            : router.push('/(parent)/pair-kid-device')
        }
        disabled={profiles.length === 0}
      />
      {!premium ? (
        <Txt size={12.5} color={colors.muted} center>
          Free plan: 1 kid device. Premium: more devices.
        </Txt>
      ) : null}
      <Txt size={12.5} color={colors.muted} lineHeight={18} center>
        On your child’s device, install LittleLoop and tap “Setting up your child’s phone or
        tablet?” It will show a code to scan or type here.
      </Txt>
      <RenameDeviceModal
        device={renaming}
        saving={rename.isPending}
        onCancel={() => setRenaming(null)}
        onSave={(name) => renaming && rename.mutate({ id: renaming.id, name })}
      />
    </ScreenContainer>
  );
}

/** Device names from the OS are often just "iPhone" — let the parent say whose it is. */
function RenameDeviceModal({
  device,
  saving,
  onCancel,
  onSave,
}: {
  device: ChildDevice | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  return (
    <Modal visible={device !== null} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Keyed so the field starts from the chosen device's current name. */}
      {device ? (
        <RenameDeviceForm key={device.id} device={device} saving={saving} onCancel={onCancel} onSave={onSave} />
      ) : null}
    </Modal>
  );
}

function RenameDeviceForm({
  device,
  saving,
  onCancel,
  onSave,
}: {
  device: ChildDevice;
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(device.name);
  const trimmed = name.trim();
  const save = () => {
    if (trimmed && !saving) onSave(trimmed);
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <View style={styles.sheet}>
        <Txt weight="black" size={21}>
          Rename device
        </Txt>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Mila’s tablet"
          placeholderTextColor={colors.dotInactive}
          maxLength={40}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Device name"
          style={styles.input}
        />
        <Button title="Save" onPress={save} loading={saving} disabled={!trimmed} />
        <Button title="Cancel" variant="ghost" size="md" onPress={onCancel} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  note: { padding: 16, backgroundColor: colors.card, borderRadius: 14, gap: 10 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 14,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.card,
    ...shadows.cardLg,
  },
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    paddingHorizontal: 16,
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: colors.parent.night,
  },
});

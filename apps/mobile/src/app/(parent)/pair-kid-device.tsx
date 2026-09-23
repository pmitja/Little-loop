import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  ChildAvatar,
  ParentHeader,
  ScreenContainer,
  SectionLabel,
  showAppAlert,
  Txt,
} from '@/components';
import { ApiError } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { CHILD_DEVICES_QUERY_KEY, claimChildDevice } from '@/features/kid/childDevicesApi';
import { colors } from '@/theme/tokens';

/**
 * Claim the code a kid device is showing, for one child. Reached from
 * Settings → Kid devices, or by scanning the kid device's QR with the phone
 * camera (littleloop://pair?code=…, routed through the PIN gate).
 */
export default function PairKidDevice() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code?: string }>();
  const profiles = useAppStore((s) => s.childProfiles);
  const activeChildId = useAppStore((s) => s.activeChildProfileId);
  const [code, setCode] = useState(() => (params.code ?? '').replace(/\D/g, '').slice(0, 6));
  const [childId, setChildId] = useState<string | null>(
    () => (profiles.length === 1 ? profiles[0].id : null) ?? activeChildId,
  );
  const [error, setError] = useState<string | null>(null);

  const claim = useMutation({
    mutationFn: claimChildDevice,
    onSuccess: (device) => {
      void queryClient.invalidateQueries({ queryKey: CHILD_DEVICES_QUERY_KEY });
      const child = profiles.find((p) => p.id === device.childProfileId);
      showAppAlert(
        'Device connected',
        `${device.name} is ready for ${child?.nickname ?? 'your child'}. Finish on that device.\n\nNew videos appear there within a few minutes — or pull down on its video list to refresh right away.`,
      );
      router.replace('/(parent)/kid-devices');
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.code === 'PREMIUM_REQUIRED') {
        router.push({ pathname: '/paywall', params: { trigger: 'settings' } });
        return;
      }
      if (cause instanceof ApiError && cause.code === 'PAIRING_NOT_FOUND') {
        setError('That code is wrong or has expired. Check the code on your child’s device.');
        return;
      }
      if (cause instanceof ApiError && cause.code === 'DEVICE_LIMIT') {
        setError('You’ve reached the limit of kid devices. Unpair one first.');
        return;
      }
      setError('Couldn’t connect. Check your internet connection and try again.');
    },
  });

  const ready = code.length === 6 && childId !== null;
  const connect = () => {
    if (!ready || !childId) return;
    setError(null);
    claim.mutate({ code, childProfileId: childId });
  };

  return (
    <ScreenContainer scroll style={styles.root}>
      <ParentHeader title="Add a kid device" onBack={() => router.back()} />

      <SectionLabel>Code on your child’s device</SectionLabel>
      <TextInput
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, '').slice(0, 6));
          setError(null);
        }}
        placeholder="123456"
        placeholderTextColor={colors.dotInactive}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus={!params.code}
        accessibilityLabel="Pairing code"
        style={styles.codeInput}
      />

      {profiles.length > 1 ? (
        <>
          <SectionLabel>Which child is this device for?</SectionLabel>
          <View style={styles.children}>
            {profiles.map((profile) => {
              const selected = profile.id === childId;
              return (
                <Pressable
                  key={profile.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={profile.nickname}
                  onPress={() => setChildId(profile.id)}
                  style={[styles.child, selected && styles.childSelected]}
                >
                  <ChildAvatar avatar={profile.avatar} size={56} />
                  <Txt weight="black" size={14} numberOfLines={1}>
                    {profile.nickname}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
          <Txt weight="bold" size={13} color={colors.red}>
            {error}
          </Txt>
        </View>
      ) : null}

      <Button title="Connect device" onPress={connect} loading={claim.isPending} disabled={!ready} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 16, gap: 16 },
  codeInput: {
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    textAlign: 'center',
    fontFamily: 'Nunito_900Black',
    fontSize: 30,
    letterSpacing: 8,
    color: colors.parent.night,
  },
  children: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  child: {
    width: 100,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  childSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  errorBanner: {
    borderRadius: 14,
    backgroundColor: '#FDEAE9',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});

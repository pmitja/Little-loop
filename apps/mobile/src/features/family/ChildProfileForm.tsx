import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  AGE_RANGES,
  AVATAR_IDS,
  createChildProfileSchema,
  type AgeRange,
  type AvatarId,
  type ChildProfile,
} from '@littleloop/shared';
import { Button, Card, ChildAvatar, SectionLabel, Txt } from '@/components';
import { colors, fonts, radii } from '@/theme/tokens';
import { api, ApiError, apiConfigured } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';

const AVATAR_LABELS: Record<AvatarId, string> = {
  bear: 'Bear',
  fox: 'Fox',
  bunny: 'Bunny',
  dino: 'Dino',
  star: 'Star',
  rocket: 'Rocket',
};

const LIMIT_OPTIONS = [30, 45, 60, 90, null] as const;

interface ChildProfileFormProps {
  onCreated: (profile: ChildProfile) => void;
  /** Server said the plan's profile limit is hit (402) — caller opens the paywall. */
  onLimitReached?: () => void;
  showLimitRow?: boolean;
  /** Rendered between the fields and the submit button (e.g. the Premium note on s22). */
  footer?: ReactNode;
}

/** Shared profile creation form: nickname, age range, avatar (s06 / s22). */
export function ChildProfileForm({
  onCreated,
  onLimitReached,
  showLimitRow = true,
  footer,
}: ChildProfileFormProps) {
  const addChildProfile = useAppStore((s) => s.addChildProfile);
  const [nickname, setNickname] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange>('5-7');
  const [avatar, setAvatar] = useState<AvatarId>('bear');
  const [limitIndex, setLimitIndex] = useState(1); // 45 min default
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dailyLimitMinutes = LIMIT_OPTIONS[limitIndex];

  const submit = async () => {
    const parsed = createChildProfileSchema.safeParse({
      nickname,
      ageRange,
      avatar,
      dailyLimitMinutes,
    });
    if (!parsed.success) {
      setError('Please enter a nickname (up to 30 characters).');
      return;
    }
    setError(null);
    setSubmitting(true);
    let profile: ChildProfile | null = null;
    if (apiConfigured()) {
      try {
        const res = await api<{ childProfile: ChildProfile }>('/child-profiles', {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        profile = res.childProfile;
      } catch (e) {
        // The server is the entitlement backstop — never create locally past a 402.
        if (e instanceof ApiError && e.status === 402) {
          setSubmitting(false);
          onLimitReached?.();
          return;
        }
        // fall through to local profile; sync will reconcile once the API is live
      }
    }
    profile ??= {
      ...parsed.data,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    addChildProfile(profile);
    setSubmitting(false);
    onCreated(profile);
  };

  return (
    <>
      <SectionLabel style={{ marginBottom: 8 }}>Name or nickname</SectionLabel>
      <TextInput
        testID="nickname-input"
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Emma"
        placeholderTextColor={colors.subtle}
        maxLength={30}
        style={styles.input}
        autoCorrect={false}
      />
      {error ? (
        <Txt weight="bold" size={12.5} color={colors.red} style={{ marginTop: 6 }}>
          {error}
        </Txt>
      ) : null}

      <SectionLabel style={{ marginTop: 20, marginBottom: 8 }}>Age range</SectionLabel>
      <View style={styles.chipRow}>
        {AGE_RANGES.map((range) => {
          const active = range === ageRange;
          return (
            <Pressable
              key={range}
              onPress={() => setAgeRange(range)}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            >
              <Txt weight="extrabold" size={15} color={active ? colors.primaryDark : colors.muted}>
                {range.replace('-', '–')}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel style={{ marginTop: 20, marginBottom: 10 }}>Choose an avatar</SectionLabel>
      <View style={styles.avatarGrid}>
        {AVATAR_IDS.map((id) => {
          const active = id === avatar;
          return (
            <Pressable
              key={id}
              onPress={() => setAvatar(id)}
              style={[styles.avatarCell, active ? styles.chipActive : styles.chipIdle]}
            >
              <ChildAvatar avatar={id} size={48} />
              <Txt weight="extrabold" size={12} color={active ? colors.primaryDark : colors.muted}>
                {AVATAR_LABELS[id]}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {showLimitRow ? (
        <Card radius={radii.input} style={styles.limitRow}>
          <View style={{ flex: 1 }}>
            <Txt weight="extrabold" size={14.5}>
              Daily watch limit
            </Txt>
            <Txt weight="semibold" size={12} color={colors.muted}>
              Optional — you can change it anytime
            </Txt>
          </View>
          <Pressable
            onPress={() => setLimitIndex((i) => (i + 1) % LIMIT_OPTIONS.length)}
            hitSlop={10}
          >
            <Txt weight="extrabold" size={15} color={colors.primary}>
              {dailyLimitMinutes === null ? 'No limit ›' : `${dailyLimitMinutes} min ›`}
            </Txt>
          </Pressable>
        </Card>
      ) : null}

      {footer}

      <View style={{ height: 28 }} />
      <Button title="Create Profile" onPress={submit} loading={submitting} />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.input,
    paddingVertical: 15,
    paddingHorizontal: 18,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.ink,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  chipIdle: { backgroundColor: colors.card, borderColor: colors.border },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  avatarCell: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 2,
    paddingTop: 12,
    paddingBottom: 9,
  },
  limitRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});

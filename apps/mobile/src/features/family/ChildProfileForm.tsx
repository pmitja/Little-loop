import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  AGE_RANGES,
  AVATAR_IDS,
  DAILY_LIMIT_MINUTES,
  createChildProfileSchema,
  formatDailyLimit,
  type AgeRange,
  type AvatarId,
  type ChildProfile,
} from '@littleloop/shared';
import { Button, Card, ChildAvatar, DailyLimitPopup, PopIn, PressableScale, SectionLabel, Txt } from '@/components';
import { KID_TINTS } from '@/theme/kid';
import { colors, fonts, radii, typography } from '@/theme/tokens';
import { api, ApiError, apiConfigured } from '@/lib/api';
import { updateChildProfile as saveChildProfile } from '@/features/family/updateChildProfile';
import { syncFamilyPlaylists } from '@/features/family/playlistSync';
import { useAppStore } from '@/stores/appStore';

const AVATAR_LABELS: Record<AvatarId, string> = {
  bear: 'Bear',
  fox: 'Fox',
  bunny: 'Bunny',
  dino: 'Dino',
  star: 'Star',
  rocket: 'Rocket',
};

interface ChildProfileFormProps {
  /** An existing profile puts the form in edit mode; omitted, it creates one. */
  profile?: ChildProfile;
  onCreated: (profile: ChildProfile) => void;
  /** Server said the plan's profile limit is hit (402) — caller opens the paywall. */
  onLimitReached?: () => void;
  showLimitRow?: boolean;
  /** Rendered between the fields and the submit button (e.g. the Premium note on s22). */
  footer?: ReactNode;
  /** Rendered under the submit button (e.g. the remove-profile link on Edit profile). */
  after?: ReactNode;
  submitLabel?: string;
  /** Lay the form out in two columns (iPad onboarding and the settings pane). */
  columns?: boolean;
}

/** Shared profile form: nickname, age range, avatar — creates (s06 / s22) or edits. */
export function ChildProfileForm({
  profile: editing,
  onCreated,
  onLimitReached,
  showLimitRow = true,
  footer,
  after,
  submitLabel,
  columns = false,
}: ChildProfileFormProps) {
  const addChildProfile = useAppStore((s) => s.addChildProfile);
  const [nickname, setNickname] = useState(editing?.nickname ?? '');
  const [ageRange, setAgeRange] = useState<AgeRange>(editing?.ageRange ?? '5-7');
  const [avatar, setAvatar] = useState<AvatarId>(editing?.avatar ?? 'bear');
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState<number | null>(
    editing?.dailyLimitMinutes === undefined
      ? DAILY_LIMIT_MINUTES.default
      : editing.dailyLimitMinutes,
  );
  const [limitOptionsOpen, setLimitOptionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Edit mode: the profile already exists, so this is a patch, not a create.
    // updateChildProfile writes locally first and mirrors to the account; a failed
    // PATCH is worth saying out loud, since it silently reverts on a cold start.
    if (editing) {
      const saved = await saveChildProfile(editing.id, parsed.data);
      setSubmitting(false);
      if (!saved) {
        setError('Saved on this device, but we couldn’t reach your account. Try again later.');
        return;
      }
      onCreated({ ...editing, ...parsed.data });
      return;
    }

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
          if (onLimitReached) onLimitReached();
          // Without a handler this used to fail silently, leaving the parent on a
          // dead form with no error and no way forward.
          else setError('You’ve reached your plan’s child-profile limit.');
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
    if (apiConfigured()) await syncFamilyPlaylists([profile]).catch(() => {});
    setSubmitting(false);
    onCreated(profile);
  };

  const fields = (
    <>
      <SectionLabel style={{ marginBottom: 8 }}>Name or nickname</SectionLabel>
      <TextInput
        accessibilityLabel="Child name or nickname"
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
              accessibilityRole="button"
              accessibilityLabel={`Age ${range.replace('-', ' to ')}`}
              accessibilityState={{ selected: active }}
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
    </>
  );
  const buddies = (
    <>
      <SectionLabel style={{ marginTop: 22, marginBottom: 12 }}>
        {nickname.trim() ? `Pick ${nickname.trim()}’s buddy` : 'Pick a buddy'}
      </SectionLabel>
      <View style={styles.avatarGrid}>
        {AVATAR_IDS.map((id) => {
          const active = id === avatar;
          return (
            <PressableScale
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${AVATAR_LABELS[id]} buddy`}
              accessibilityState={{ selected: active }}
              onPress={() => setAvatar(id)}
              haptic="select"
              pressedScale={0.92}
              style={[styles.avatarCell, active ? [styles.avatarActive, { backgroundColor: KID_TINTS[id] }] : styles.avatarIdle]}
            >
              {active ? (
                <PopIn key={`pick-${id}`}>
                  <ChildAvatar avatar={id} size={78} />
                </PopIn>
              ) : (
                <ChildAvatar avatar={id} size={72} />
              )}
              {active ? (
                <PopIn style={styles.avatarCheck}>
                  <Txt weight="black" size={14} color="#FFFFFF">✓</Txt>
                </PopIn>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </>
  );
  const limitRow = (
    <>
      {showLimitRow ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Daily watch limit ${formatDailyLimit(dailyLimitMinutes)}. Tap to choose.`}
            accessibilityState={{ expanded: limitOptionsOpen }}
            onPress={() => setLimitOptionsOpen(true)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Card radius={radii.input} style={styles.limitRow}>
              <View style={{ flex: 1 }}>
                <Txt weight="extrabold" size={14.5}>
                  Daily watch limit
                </Txt>
                <Txt weight="semibold" size={12} color={colors.muted}>
                  Optional — you can change it anytime
                </Txt>
              </View>
              <Txt weight="extrabold" size={15} color={colors.primary}>
                {`${formatDailyLimit(dailyLimitMinutes)} ›`}
              </Txt>
            </Card>
          </Pressable>
          <DailyLimitPopup
            visible={limitOptionsOpen}
            value={dailyLimitMinutes}
            onCancel={() => setLimitOptionsOpen(false)}
            onChange={setDailyLimitMinutes}
          />
        </>
      ) : null}
    </>
  );
  const submitButton = (
    <Button
      title={submitLabel ?? (editing ? 'Save changes' : 'Create profile')}
      onPress={submit}
      loading={submitting}
      style={columns ? styles.columnsSubmit : undefined}
    />
  );

  // iPad: name on the left, buddies on the right, the action at the bottom right.
  if (columns) {
    return (
      <View style={styles.columnsRoot}>
        <View style={styles.columns}>
          <View style={{ flex: 1 }}>
            {fields}
            {limitRow}
            {footer}
          </View>
          <View style={{ flex: 1.3 }}>{buddies}</View>
        </View>
        <View style={styles.columnsActions}>
          <View style={{ flex: 1 }}>{after}</View>
          {submitButton}
        </View>
      </View>
    );
  }

  return (
    <>
      {fields}
      {buddies}
      {limitRow}
      {footer}

      <View style={{ height: 28 }} />
      {submitButton}
      {after}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.child.skyDeep,
    borderRadius: radii.input,
    minHeight: 62,
    paddingVertical: 15,
    paddingHorizontal: 18,
    fontFamily: fonts.extrabold,
    fontSize: 20 * typography.scale,
    color: colors.ink,
    shadowColor: colors.child.skyDeep,
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
  chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.child.skyDeep },
  chipIdle: { backgroundColor: colors.card, borderColor: colors.border },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  avatarCell: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 3,
  },
  avatarIdle: { backgroundColor: colors.card, borderColor: 'transparent' },
  avatarActive: { borderColor: colors.child.skyDeep },
  avatarCheck: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.parent.paper,
    backgroundColor: colors.child.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.7 },
  columnsRoot: { flex: 1, gap: 28 },
  columns: { flex: 1, flexDirection: 'row', gap: 40 },
  columnsActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  columnsSubmit: { width: 320 },
});

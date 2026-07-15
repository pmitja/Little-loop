import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { DAILY_LIMIT_MINUTES, formatDailyLimit } from '@littleloop/shared';
import { colors, radii, shadows } from '@/theme/tokens';
import { DurationPicker, DurationPickerContent } from './DurationPicker';
import { OptionList } from './ParentPatterns';
import { Txt } from './Txt';

export const DAILY_LIMIT_PRESETS = [
  { value: 20, nickname: 'Short & sweet' },
  { value: 45, nickname: 'Just right' },
  { value: 60, nickname: 'Movie day' },
  { value: 90, nickname: 'Rainy Sunday' },
] as const;

const PRESET_VALUES = DAILY_LIMIT_PRESETS.map((option) => option.value);

interface DailyLimitOptionsProps {
  value: number | null;
  onChange: (minutes: number) => void;
  onCustomPress?: () => void;
}

/** The shared preset + custom-limit control used wherever a parent edits a limit. */
export function DailyLimitOptions({ value, onChange, onCustomPress }: DailyLimitOptionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCustom = value !== null && !PRESET_VALUES.includes(value as (typeof PRESET_VALUES)[number]);

  return (
    <View style={styles.container}>
      <OptionList
        options={[...DAILY_LIMIT_PRESETS]}
        selected={isCustom ? null : value}
        onSelect={onChange}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isCustom }}
        accessibilityLabel={
          isCustom ? `Custom limit, ${formatDailyLimit(value)}. Change it` : 'Set a custom limit'
        }
        onPress={onCustomPress ?? (() => setPickerOpen(true))}
        style={({ pressed }) => [
          styles.customRow,
          isCustom && styles.customRowSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.customCopy}>
          <Txt weight="black" size={16}>
            {isCustom ? formatDailyLimit(value) : 'Custom'}
          </Txt>
          <Txt size={13} color={colors.parent.muted}>
            Pick your own hours and minutes
          </Txt>
        </View>
        {isCustom ? (
          <Txt weight="black" color={colors.child.skyDeep}>✓</Txt>
        ) : (
          <Txt size={22} color={colors.parent.muted}>›</Txt>
        )}
      </Pressable>
      {onCustomPress ? null : (
        <DurationPicker
          visible={pickerOpen}
          initialMinutes={value ?? DAILY_LIMIT_MINUTES.default}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(minutes) => {
            setPickerOpen(false);
            onChange(minutes);
          }}
        />
      )}
    </View>
  );
}

interface DailyLimitPopupProps {
  visible: boolean;
  value: number | null;
  onCancel: () => void;
  onChange: (minutes: number) => void;
}

/** Presets and the custom duration picker presented as one continuous popup. */
export function DailyLimitPopup({ visible, value, onCancel, onChange }: DailyLimitPopupProps) {
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (!visible) setCustomOpen(false);
  }, [visible]);

  const closeWithValue = (minutes: number) => {
    onChange(minutes);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={customOpen ? () => setCustomOpen(false) : onCancel}
    >
      <View style={styles.backdrop}>
        {customOpen ? (
          <DurationPickerContent
            initialMinutes={value ?? DAILY_LIMIT_MINUTES.default}
            onCancel={() => setCustomOpen(false)}
            onConfirm={closeWithValue}
          />
        ) : (
          <View style={styles.popupCard}>
            <Txt weight="black" size={22}>Daily watch limit</Txt>
            <Txt weight="semibold" size={14} color={colors.parent.muted} style={styles.popupSubtitle}>
              Choose a daily limit or create your own.
            </Txt>
            <DailyLimitOptions
              value={value}
              onChange={closeWithValue}
              onCustomPress={() => setCustomOpen(true)}
            />
            <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10}>
              <Txt weight="extrabold" size={13.5} color={colors.subtle} style={styles.cancel}>
                Cancel
              </Txt>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  popupCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.cardXl,
    padding: 24,
    ...shadows.cardLg,
    shadowOpacity: 0.3,
  },
  popupSubtitle: { marginTop: 6, marginBottom: 20 },
  cancel: { alignSelf: 'center', marginTop: 18 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  customRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  customCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
});

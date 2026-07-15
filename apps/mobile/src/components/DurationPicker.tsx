import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import {
  DAILY_LIMIT_MINUTES,
  clampDailyLimit,
  dailyLimitHourOptions,
  dailyLimitMinuteOptions,
  formatDailyLimit,
} from '@littleloop/shared';
import { colors, radii, shadows } from '@/theme/tokens';
import { Button } from './Button';
import { Txt } from './Txt';

const ROW_HEIGHT = 46;
// Rows visible through the window; the centre one is the selection.
const VISIBLE_ROWS = 3;
const PAD = (ROW_HEIGHT * (VISIBLE_ROWS - 1)) / 2;

const HOURS = dailyLimitHourOptions();
const MINUTES = dailyLimitMinuteOptions();

/**
 * One snap-scrolling column. Built on ScrollView rather than a native picker so
 * that adding a custom limit doesn't pull in a native module — the parent app
 * ships as a prebuilt binary and a new dependency would force a rebuild.
 */
function Wheel({
  values,
  value,
  unit,
  onChange,
}: {
  values: number[];
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const index = Math.max(values.indexOf(value), 0);
  // Where the column physically sits. It starts at -1 (never positioned) so the
  // first pass scrolls to the incoming value without animating.
  const settledIndex = useRef(-1);

  // Follows `value` when it moves for a reason other than this column's own
  // scroll — mounting, and the clamp pulling 4 hr 30 min back down to 4 hr.
  useEffect(() => {
    if (settledIndex.current === index) return;
    const animated = settledIndex.current >= 0;
    settledIndex.current = index;
    ref.current?.scrollTo({ y: index * ROW_HEIGHT, animated });
  }, [index]);

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ROW_HEIGHT);
    const i = Math.min(Math.max(raw, 0), values.length - 1);
    settledIndex.current = i;
    if (values[i] !== value) onChange(values[i]);
  };

  return (
    <View style={styles.wheel}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PAD }}
        onMomentumScrollEnd={onSettle}
        // Momentum never starts on a slow drag, so the wheel would keep a value
        // it no longer shows without this.
        onScrollEndDrag={onSettle}
      >
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`${v} ${unit}`}
            accessibilityState={{ selected: v === value }}
            onPress={() => onChange(v)}
            style={styles.row}
          >
            <Txt
              weight={v === value ? 'black' : 'bold'}
              size={v === value ? 24 : 20}
              color={v === value ? colors.parent.night : colors.subtle}
            >
              {v}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <Txt weight="extrabold" size={13} color={colors.parent.muted} style={styles.unit}>
        {unit}
      </Txt>
    </View>
  );
}

interface DurationPickerProps {
  visible: boolean;
  initialMinutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}

interface DurationPickerContentProps {
  initialMinutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
  active?: boolean;
}

/** Picker card without its own modal, for flows that transition within one popup. */
export function DurationPickerContent({
  initialMinutes,
  onCancel,
  onConfirm,
  active = true,
}: DurationPickerContentProps) {
  const [minutes, setMinutes] = useState(() => clampDailyLimit(initialMinutes));

  // Each opening starts from the limit currently in force, not from wherever the
  // wheels were left last time.
  useEffect(() => {
    if (active) setMinutes(clampDailyLimit(initialMinutes));
  }, [active, initialMinutes]);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <View style={styles.card}>
      <Txt weight="black" size={22}>
        Custom limit
      </Txt>
      <Txt weight="semibold" size={14} color={colors.parent.muted} style={{ marginTop: 6 }}>
        {`Anywhere from ${formatDailyLimit(DAILY_LIMIT_MINUTES.min)} to ${formatDailyLimit(DAILY_LIMIT_MINUTES.max)} a day.`}
      </Txt>

      <View style={styles.wheels}>
        <View pointerEvents="none" style={styles.selectionBand} />
        <Wheel
          values={HOURS}
          value={hours}
          unit="hours"
          onChange={(h) => setMinutes(clampDailyLimit(h * 60 + mins))}
        />
        <Wheel
          values={MINUTES}
          value={mins}
          unit="min"
          onChange={(m) => setMinutes(clampDailyLimit(hours * 60 + m))}
        />
      </View>

      <View style={styles.preview}>
        <Txt weight="black" size={18} color={colors.primaryDark}>
          {formatDailyLimit(minutes)}
        </Txt>
        <Txt weight="semibold" size={13} color={colors.parent.muted}>
          a day
        </Txt>
      </View>

      <Button
        title="Use this limit"
        onPress={() => onConfirm(minutes)}
        style={{ alignSelf: 'stretch' }}
      />
      <Pressable onPress={onCancel} hitSlop={10}>
        <Txt weight="extrabold" size={13.5} color={colors.subtle} style={{ marginTop: 14 }}>
          Cancel
        </Txt>
      </Pressable>
    </View>
  );
}

/** Hours + minutes wheels for a custom daily limit (5 min – 4 hr). */
export function DurationPicker({ visible, initialMinutes, onCancel, onConfirm }: DurationPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <DurationPickerContent
          active={visible}
          initialMinutes={initialMinutes}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.cardXl,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...shadows.cardLg,
    shadowOpacity: 0.3,
  },
  wheels: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 20,
    height: ROW_HEIGHT * VISIBLE_ROWS,
    marginTop: 18,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ROW_HEIGHT,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
  },
  wheel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { height: ROW_HEIGHT, minWidth: 46, alignItems: 'center', justifyContent: 'center' },
  unit: { width: 44 },
  preview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 18,
    marginBottom: 20,
  },
});

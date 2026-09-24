import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { formatDailyLimit, type AvatarId } from '@littleloop/shared';
import { colors, radii, shadows } from '@/theme/tokens';
import { springs } from '@/theme/motion';
import { ChildAvatar } from './ChildAvatar';
import { AppIcon } from './AppIcon';
import { PopIn, PressableScale } from './Motion';
import { Txt } from './Txt';

/**
 * Horizontal child chips. `onEdit` puts a pencil on the selected chip — the
 * streaming-app convention (Netflix/Disney+/Paramount+) and the only visible route
 * into renaming a child or changing their avatar.
 */
export function ChildSwitcher({ profiles, activeId, onSelect, onAdd, onEdit, compact = false }: { profiles: { id: string; nickname: string; avatar: AvatarId }[]; activeId: string | null; onSelect: (id: string) => void; onAdd?: () => void; onEdit?: (id: string) => void; compact?: boolean }) {
  const height = compact ? 36 : 44;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switcherScroll} contentContainerStyle={styles.switcher}>
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <PressableScale
            key={p.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Show ${p.nickname}`}
            onPress={() => {
              if (!active) void Haptics.selectionAsync();
              onSelect(p.id);
            }}
            pressedScale={0.94}
            style={[styles.chip, { height, borderRadius: height / 2 }, active && styles.chipActive]}
          >
            <ChildAvatar avatar={p.avatar} size={compact ? 28 : 32} />
            <Txt weight="extrabold" size={compact ? 13 : 15} color={active ? '#fff' : colors.parent.muted}>{p.nickname}</Txt>
            {active && onEdit ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${p.nickname}’s profile`} onPress={() => onEdit(p.id)} hitSlop={10} style={styles.editBadge}>
                <Txt weight="black" size={9} color="#fff">EDIT</Txt>
              </Pressable>
            ) : null}
          </PressableScale>
        );
      })}
      {onAdd ? (
        <PressableScale accessibilityRole="button" accessibilityLabel="Add child" onPress={onAdd} pressedScale={0.9} style={[styles.addChip, { width: height, height, borderRadius: height / 2 }]}>
          <Txt weight="black" size={20} color={colors.parent.muted}>+</Txt>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

export function IdentityCard({ name = 'Parent', email, onPress }: { name?: string; email?: string; onPress?: () => void }) {
  return (
    <PressableScale accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress} pressedScale={0.98} style={styles.identity}>
      <View style={styles.identityAvatar}><Txt weight="black" size={18} color="#fff">{name[0]?.toUpperCase()}</Txt></View>
      <View style={styles.identityText}>
        <Txt weight="extrabold" size={16} numberOfLines={1}>{name}</Txt>
        <Txt weight="bold" size={12.5} color={colors.parent.muted} numberOfLines={1}>{email ?? 'Parent account'}</Txt>
      </View>
      {onPress ? <Txt weight="black" size={22} color={colors.subtle}>›</Txt> : null}
    </PressableScale>
  );
}

export function PremiumBanner({ onPress, title = 'Upgrade to Premium', subtitle = 'More kids, whole channels and caregivers' }: { onPress: () => void; title?: string; subtitle?: string }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} pressedScale={0.98} style={shadows.card}>
      <LinearGradient colors={[colors.child.sun, '#FFAF3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premium}>
        <PopIn wiggleEvery={4200}><AppIcon name="premium" size={40} style={{ borderRadius: 12 }} /></PopIn>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt weight="black" size={16} color="#4A3A20">{title}</Txt>
          <Txt weight="bold" size={12.5} color="#4A3A20">{subtitle}</Txt>
        </View>
        <Txt weight="black" size={22} color="#4A3A20">›</Txt>
      </LinearGradient>
    </PressableScale>
  );
}

/** The child's buddy asks the question — a friendlier frame for a settings screen. */
export function OwlBubble({ children, avatar = 'bear' }: { children: ReactNode; avatar?: AvatarId }) {
  return (
    <View style={styles.owlRow}>
      <PopIn><ChildAvatar avatar={avatar} size={64} /></PopIn>
      <View style={styles.bubble}><Txt weight="black" size={17} lineHeight={23} color={colors.parent.night}>{children}</Txt></View>
    </View>
  );
}

export function OptionList({ options, selected, onSelect }: { options: { value: number; nickname: string }[]; selected: number | null; onSelect: (v: number) => void }) {
  return (
    <View style={styles.options}>
      {options.map((o, i) => {
        const on = o.value === selected;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) void Haptics.selectionAsync();
              onSelect(o.value);
            }}
            style={[styles.option, i > 0 && styles.optionDivider, on && styles.optionSelected]}
          >
            <Txt weight="black" size={18} style={styles.optionValue}>{formatDailyLimit(o.value)}</Txt>
            <Txt weight="bold" size={14} color={on ? colors.child.skyDeep : colors.parent.muted} style={{ flex: 1 }}>{o.nickname}</Txt>
            {on ? (
              <PopIn key={`on-${o.value}`}>
                <View style={styles.check}><Txt weight="black" size={14} color="#FFFFFF">✓</Txt></View>
              </PopIn>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Bar({ fraction, color, index }: { fraction: number; color: string; index: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withDelay(120 + index * 45, withSpring(fraction, springs.gentle));
  }, [fraction, grow, index]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(6, grow.value * 100)}%` }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/** Seven days of watch time; bars grow in one after another. Today is coral. */
export function WeekBars({ values, labels }: { values: number[]; labels?: string[] }) {
  const week = values.slice(-7);
  const max = Math.max(...week, 1);
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.bars}>
        {week.map((v, i) => (
          <Bar key={i} index={i} fraction={v / max} color={i === week.length - 1 ? colors.child.coral : v / max > 0.6 ? colors.child.skyDeep : '#E4DCCF'} />
        ))}
      </View>
      {labels ? (
        <View style={styles.barLabels}>
          {labels.slice(-7).map((label, i) => (
            <Txt key={i} weight="extrabold" size={11.5} color={i === labels.length - 1 ? colors.child.coral : colors.parent.muted} center style={{ flex: 1 }}>
              {label}
            </Txt>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function StatusBadge({ state = 'LIVE' }: { state?: 'LIVE' | 'REVIEW' }) {
  const c = state === 'LIVE' ? colors.state.live : colors.state.review;
  return <View style={[styles.badge, { backgroundColor: c.bg }]}><Txt weight="black" size={10} color={c.text}>{state === 'LIVE' ? 'Approved' : 'Needs review'}</Txt></View>;
}

const styles = StyleSheet.create({
  switcherScroll: { flexGrow: 0, flexShrink: 0 },
  switcher: { gap: 8 },
  chip: { backgroundColor: '#fff', paddingLeft: 6, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipActive: { backgroundColor: colors.parent.night },
  editBadge: { minWidth: 34, height: 22, borderRadius: 11, marginLeft: 2, marginRight: -8, paddingHorizontal: 5, backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' },
  addChip: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9C2B7', alignItems: 'center', justifyContent: 'center' },
  identity: { backgroundColor: '#fff', borderRadius: radii.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.card },
  identityAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.parent.night, alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, minWidth: 0, gap: 1 },
  premium: { borderRadius: radii.card, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  owlRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderBottomLeftRadius: 4, ...shadows.card },
  options: { backgroundColor: '#fff', borderRadius: radii.card, overflow: 'hidden', ...shadows.card },
  option: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  optionDivider: { borderTopWidth: 1, borderTopColor: '#F0EBE1' },
  optionSelected: { backgroundColor: '#EAF6FA', borderLeftColor: colors.child.skyDeep },
  optionValue: { minWidth: 72 },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.child.skyDeep, alignItems: 'center', justifyContent: 'center' },
  bars: { height: 92, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bar: { flex: 1, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  barLabels: { flexDirection: 'row', gap: 10 },
  badge: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 7 },
});

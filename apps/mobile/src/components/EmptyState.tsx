import type { ReactNode } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Txt } from './Txt';

interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Centered empty-state card (s07). */
export function EmptyState({
  illustration,
  title,
  body,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <Card radius={radii.cardXl} padding={0} large style={styles.card}>
      {illustration}
      <Txt weight="black" size={21} center style={{ marginTop: 20 }}>
        {title}
      </Txt>
      <Txt weight="semibold" size={14} color={colors.muted} center lineHeight={21.5} style={styles.body}>
        {body}
      </Txt>
      <Button title={ctaLabel} onPress={onCta} size="md" style={styles.cta} />
      {secondaryLabel ? (
        <Pressable onPress={onSecondary} hitSlop={8}>
          <Txt weight="extrabold" size={14} color={colors.subtle} style={{ marginTop: 16 }}>
            {secondaryLabel}
          </Txt>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 28 },
  body: { marginTop: 10, marginBottom: 24 },
  cta: { alignSelf: 'stretch', height: 54, borderRadius: 27 },
});

/** Dashed "add a video" placeholder used as the s07 illustration. */
export function AddVideoIllustration() {
  return (
    <View style={illo.frame}>
      <View style={illo.plusCircle}>
        <Txt weight="extrabold" size={24} color={colors.primary}>
          +
        </Txt>
      </View>
    </View>
  );
}

const illo = StyleSheet.create({
  frame: {
    width: 120,
    height: 80,
    borderRadius: 18,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: '#BFD9F4',
    backgroundColor: '#F6FAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

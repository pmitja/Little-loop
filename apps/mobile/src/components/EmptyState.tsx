import type { ReactNode } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Txt } from './Txt';
import { StoryIllustration } from './StoryIllustration';

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

/** Friendly, self-explanatory add-video scene used by empty playlists. */
export function AddVideoIllustration() {
  return <StoryIllustration scene="add-video" width={168} />;
}

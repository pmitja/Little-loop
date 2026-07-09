import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';

/** Uppercase 12.5px letter-spaced label used across forms and settings. */
export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Txt
      weight="extrabold"
      size={12.5}
      color={colors.muted}
      style={[{ textTransform: 'uppercase', letterSpacing: 0.75 }, style]}
    >
      {children}
    </Txt>
  );
}

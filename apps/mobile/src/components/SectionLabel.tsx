import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';

/** Parent section heading — conversational and scannable, never a micro-label. */
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
      size={15}
      color={colors.parent.night}
      style={style}
    >
      {children}
    </Txt>
  );
}

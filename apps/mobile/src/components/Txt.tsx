import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, type FontWeight } from '@/theme/tokens';

interface TxtProps extends TextProps {
  weight?: FontWeight;
  size?: number;
  color?: string;
  center?: boolean;
  lineHeight?: number;
}

/** Typography primitive: Nunito with design-token weights. */
export function Txt({
  weight = 'semibold',
  size = 15,
  color = colors.ink,
  center,
  lineHeight,
  style,
  ...rest
}: TxtProps) {
  const base: TextStyle = {
    fontFamily: fonts[weight],
    fontSize: size,
    color,
    ...(center ? { textAlign: 'center' } : null),
    ...(lineHeight ? { lineHeight } : null),
  };
  return <Text style={[base, style]} {...rest} />;
}

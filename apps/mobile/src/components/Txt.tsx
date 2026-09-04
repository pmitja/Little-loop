import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, typography, type FontWeight } from '@/theme/tokens';

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
  allowFontScaling = true,
  style,
  ...rest
}: TxtProps) {
  const base: TextStyle = {
    fontFamily: fonts[weight],
    fontSize: size * typography.scale,
    color,
    ...(center ? { textAlign: 'center' } : null),
    ...(lineHeight ? { lineHeight: lineHeight * typography.scale } : null),
  };
  return <Text allowFontScaling={allowFontScaling} style={[base, style]} {...rest} />;
}

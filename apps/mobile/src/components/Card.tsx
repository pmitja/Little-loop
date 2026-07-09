import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows } from '@/theme/tokens';

interface CardProps {
  children: ReactNode;
  radius?: number;
  padding?: number;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, radius = radii.card, padding = 16, large, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius,
          padding,
        },
        large ? shadows.cardLg : shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

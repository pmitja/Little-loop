import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, scaleUi, shadows } from '@/theme/tokens';
import { Txt } from './Txt';
import { PressableScale } from './Motion';

export type ButtonVariant = 'primary' | 'coral' | 'outline' | 'ghost';
export type ButtonSize = 'lg' | 'md';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<ButtonSize, number> = { lg: scaleUi(58), md: scaleUi(48) };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  icon,
  style,
}: ButtonProps) {
  const height = HEIGHTS[size];
  const inactive = disabled || loading;

  const textColor =
    variant === 'primary' || variant === 'coral'
      ? '#FFFFFF'
      : variant === 'outline'
        ? colors.primaryDark
        : colors.subtle;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Txt weight="black" size={size === 'lg' ? 17 : 15} color={textColor}>
            {title}
          </Txt>
        </>
      )}
    </View>
  );

  const shape: ViewStyle = {
    height,
    borderRadius: height / 2,
    opacity: inactive ? 0.55 : 1,
  };

  if (variant === 'coral') {
    return (
      <PressableScale onPress={onPress} disabled={inactive} haptic="light" style={[shadows.coralButton, style]}>
        <LinearGradient
          colors={colors.coralGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, shape]}
        >
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.parent.night }
      : variant === 'outline'
        ? { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary }
        : { backgroundColor: 'transparent' };

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={variant === 'ghost' ? false : 'light'}
      pressedScale={0.97}
      style={[
        styles.fill,
        shape,
        variantStyle,
        variant === 'primary' && !inactive ? shadows.navyButton : null,
        style,
      ]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});

import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

interface ScreenContainerProps {
  children: ReactNode;
  mode?: 'parent' | 'child' | 'dark' | 'plum';
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Safe-area screen wrapper with per-mode background: cream / warm gradient / player dark. */
export function ScreenContainer({
  children,
  mode = 'parent',
  scroll,
  padded = true,
  style,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const resolvedStyle = StyleSheet.flatten(style) ?? {};
  const extraTop = typeof resolvedStyle.paddingTop === 'number' ? resolvedStyle.paddingTop : 0;
  const extraBottom = typeof resolvedStyle.paddingBottom === 'number' ? resolvedStyle.paddingBottom : 0;
  const safeTopStyle = { paddingTop: insets.top + extraTop };
  const safeBottomStyle = {
    paddingBottom: Math.max(insets.bottom, scroll ? 24 : 12) + extraBottom,
  };
  const inner: StyleProp<ViewStyle> = [
    {
      flex: 1,
      ...safeBottomStyle,
      paddingHorizontal: padded ? spacing.screenX : 0,
    },
    style,
    safeTopStyle,
    safeBottomStyle,
  ];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        safeBottomStyle,
        padded ? { paddingHorizontal: spacing.screenX } : null,
        style,
        safeTopStyle,
        safeBottomStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={inner}>{children}</View>
  );

  if (mode === 'child' || mode === 'plum') {
    return (
      <LinearGradient colors={mode === 'plum' ? [colors.child.plum, '#5A3F96'] : [colors.child.sky, colors.child.cream]} style={styles.flex}>
        {body}
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.flex, { backgroundColor: mode === 'dark' ? colors.playerBg : colors.bg }]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, shadows } from '@/theme/tokens';
import { springs } from '@/theme/motion';
import { PressableScale } from './Motion';
import { Txt } from './Txt';

/**
 * Onboarding progress: back, a bar that fills forward from the previous step
 * as the screen arrives, and "2 of 3".
 */
export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  const fill = useSharedValue((step - 1) / total);
  useEffect(() => {
    fill.value = withSpring(step / total, springs.gentle);
  }, [step, total, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={styles.row}>
      {onBack ? (
        <PressableScale accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} pressedScale={0.9} style={styles.back}>
          <Svg width={18} height={18} viewBox="0 0 16 16">
            <Path d="M10 3 L5 8 L10 13" stroke={colors.parent.night} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </PressableScale>
      ) : null}
      <View accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}`} style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Txt weight="extrabold" size={13} color={colors.parent.muted}>{step} of {total}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'stretch' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E7E1D8', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.parent.night },
});

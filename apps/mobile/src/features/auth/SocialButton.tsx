import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Txt } from '@/components';
import { colors } from '@/theme/tokens';

export type SocialProvider = 'apple' | 'google';

function SocialProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === 'apple') {
    return (
      <Svg width={21} height={21} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Path
          fill="#FFFFFF"
          d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.33-.07 2.26.74 3.04.79 1.17-.24 2.29-.93 3.54-.84 1.5.12 2.63.71 3.38 1.78-3.1 1.86-2.36 5.95.48 7.09-.57 1.5-1.31 2.99-2.44 4.15ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 18 18" accessibilityElementsHidden>
      <Path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <Path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
      <Path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </Svg>
  );
}

export function SocialButton({
  provider,
  busy,
  onPress,
}: {
  provider: SocialProvider;
  busy: boolean;
  onPress: () => void;
}) {
  const apple = provider === 'apple';
  const title = apple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        apple ? styles.appleButton : styles.googleButton,
        pressed && !busy ? styles.buttonPressed : null,
        busy ? styles.buttonDisabled : null,
      ]}
    >
      <View style={styles.socialIcon} pointerEvents="none">
        <SocialProviderIcon provider={provider} />
      </View>
      <Txt weight="extrabold" size={15} color={apple ? '#FFFFFF' : colors.parent.night}>
        {title}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  socialButton: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 52,
  },
  socialIcon: { position: 'absolute', left: 18, alignItems: 'center', justifyContent: 'center' },
  appleButton: { backgroundColor: '#111111' },
  googleButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonPressed: { opacity: 0.78 },
  buttonDisabled: { opacity: 0.55 },
});

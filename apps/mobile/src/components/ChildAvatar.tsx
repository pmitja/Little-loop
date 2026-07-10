import { View } from 'react-native';
import type { AvatarId } from '@littleloop/shared';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';

interface ChildAvatarProps {
  avatar: AvatarId;
  size?: number;
  selected?: boolean;
}

/** iOS emoji per avatar id (concept: animal faces, not custom art). */
const EMOJI: Record<AvatarId, string> = {
  bear: '🐻',
  fox: '🦊',
  bunny: '🐰',
  dino: '🦕',
  star: '⭐',
  rocket: '🚀',
};

/** Child avatar rendered as a native emoji; `selected` adds the primary ring. */
export function ChildAvatar({ avatar, size = 48, selected }: ChildAvatarProps) {
  const face = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.68} style={{ lineHeight: size * 0.94 }}>
        {EMOJI[avatar] ?? '🦊'}
      </Txt>
    </View>
  );

  if (!selected) return face;
  return (
    <View
      style={{
        padding: 3,
        borderRadius: (size + 12) / 2,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: colors.primaryTint,
      }}
    >
      {face}
    </View>
  );
}

import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { AvatarId } from '@littleloop/shared';

interface ChildAvatarProps {
  avatar: AvatarId;
  size?: number;
  selected?: boolean;
}

const AVATAR_ART: Record<AvatarId, number> = {
  bear: require('../../assets/images/characters/bear-transparent.png'),
  fox: require('../../assets/images/characters/fox-transparent.png'),
  bunny: require('../../assets/images/characters/bunny-transparent.png'),
  dino: require('../../assets/images/characters/dino-transparent.png'),
  star: require('../../assets/images/characters/star-transparent.png'),
  rocket: require('../../assets/images/characters/rocket-transparent.png'),
};

/** A background-free character icon. Selection is shown by the owning control. */
export function ChildAvatar({ avatar, size = 48 }: ChildAvatarProps) {
  return (
    <Image
      source={AVATAR_ART[avatar] ?? AVATAR_ART.fox}
      style={[styles.icon, { width: size, height: size }]}
      contentFit="contain"
      transition={120}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  icon: { flexShrink: 0 },
});

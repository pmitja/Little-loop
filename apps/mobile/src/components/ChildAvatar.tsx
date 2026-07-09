import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { AvatarId } from '@littleloop/shared';
import { colors } from '@/theme/tokens';

interface ChildAvatarProps {
  avatar: AvatarId;
  size?: number;
  selected?: boolean;
}

const INK = colors.ink;

function Face({ fill, children }: { fill: string; children?: React.ReactNode }) {
  return (
    <>
      <Circle cx={24} cy={27} r={20} fill={fill} />
      <Circle cx={18.5} cy={25} r={2} fill={INK} />
      <Circle cx={29.5} cy={25} r={2} fill={INK} />
      <Path d="M18.5 31 Q24 36 29.5 31" stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      {children}
    </>
  );
}

/** The six designed avatars (s06) drawn as SVG. `selected` adds the primary ring. */
export function ChildAvatar({ avatar, size = 48, selected }: ChildAvatarProps) {
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {avatar === 'bear' && (
        <>
          <Circle cx={9} cy={9} r={7} fill="#E8BE93" />
          <Circle cx={39} cy={9} r={7} fill="#E8BE93" />
          <Face fill="#F4D8B8" />
        </>
      )}
      {avatar === 'fox' && (
        <>
          <Rect x={3} y={2} width={13} height={13} rx={3} fill="#F7B990" transform="rotate(45 9.5 8.5)" />
          <Rect x={32} y={2} width={13} height={13} rx={3} fill="#F7B990" transform="rotate(45 38.5 8.5)" />
          <Face fill="#FFD9C4" />
        </>
      )}
      {avatar === 'bunny' && (
        <>
          <Rect x={11} y={0} width={9} height={20} rx={4.5} fill="#E3D0F0" />
          <Rect x={28} y={0} width={9} height={20} rx={4.5} fill="#E3D0F0" />
          <Face fill="#EFE1F8" />
        </>
      )}
      {avatar === 'dino' && (
        <>
          <Rect x={13} y={3} width={9} height={9} rx={2} fill="#9BDDB9" transform="rotate(45 17.5 7.5)" />
          <Rect x={25} y={1} width={10} height={10} rx={2} fill="#9BDDB9" transform="rotate(45 30 6)" />
          <Face fill="#CDEEDC" />
        </>
      )}
      {avatar === 'star' && (
        <>
          <Circle cx={24} cy={24} r={24} fill="#FFF3D2" />
          <Path
            d="M24 10.5 L27.4 19.6 L37.1 20 L29.5 26 L32.2 35.4 L24 29.9 L15.8 35.4 L18.5 26 L10.9 20 L20.6 19.6 Z"
            fill="#FFB84D"
          />
        </>
      )}
      {avatar === 'rocket' && (
        <>
          <Circle cx={24} cy={24} r={24} fill="#DCEBFD" />
          <Path d="M24 10 L32 22 L16 22 Z" fill={colors.primary} />
          <Path d="M16.5 22 H31.5 V29 Q31.5 36 24 36 Q16.5 36 16.5 29 Z" fill={colors.primary} />
        </>
      )}
    </Svg>
  );

  if (!selected) return svg;
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
      {svg}
    </View>
  );
}

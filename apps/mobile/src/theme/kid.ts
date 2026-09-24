import type { AvatarId } from '@littleloop/shared';
import { colors } from './tokens';

/**
 * Each buddy gets its own sky, so two children sharing a phone can tell whose
 * world they are in without reading a name.
 */
export const KID_SKIES: Record<AvatarId, readonly [string, string, string]> = {
  fox: [colors.child.sky, '#7FD4E8', colors.child.cream],
  dino: ['#5CC46C', '#9FDDA8', colors.child.cream],
  bear: ['#F2A65A', '#F8C995', colors.child.cream],
  bunny: ['#9C83DD', '#C5B6EE', colors.child.cream],
  star: ['#F5BE3A', '#FAD982', colors.child.cream],
  rocket: ['#5B8DEF', '#9BB9F5', colors.child.cream],
};

/** The soft disc behind a buddy in avatars and chips. */
export const KID_TINTS: Record<AvatarId, string> = {
  fox: '#FFF1EC',
  dino: '#E3F6EA',
  bear: '#FFF3E3',
  bunny: '#F1ECFB',
  star: '#FFF6D9',
  rocket: '#E8F0FE',
};

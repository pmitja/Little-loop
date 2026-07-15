export const FREE_LIMITS = {
  childProfiles: 1,
  playlists: 1,
  videosPerPlaylist: 15,
  avatars: 6,
} as const;

export const AVATAR_IDS = ['bear', 'fox', 'bunny', 'dino', 'star', 'rocket'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const AGE_RANGES = ['2-4', '5-7', '8-10'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const DAILY_LIMIT_MINUTES = { min: 5, max: 240, default: 45 } as const;

/** Granularity of a custom daily limit — the minutes wheel steps in fives. */
export const DAILY_LIMIT_STEP_MINUTES = 5;

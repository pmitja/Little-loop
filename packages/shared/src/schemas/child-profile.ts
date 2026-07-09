import { z } from 'zod';
import { AVATAR_IDS, AGE_RANGES, DAILY_LIMIT_MINUTES } from '../constants';

export const createChildProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30),
  ageRange: z.enum(AGE_RANGES),
  avatar: z.enum(AVATAR_IDS),
  dailyLimitMinutes: z
    .number()
    .int()
    .min(DAILY_LIMIT_MINUTES.min)
    .max(DAILY_LIMIT_MINUTES.max)
    .nullable()
    .optional(),
});

export type CreateChildProfileInput = z.infer<typeof createChildProfileSchema>;

export interface ChildProfile extends CreateChildProfileInput {
  id: string;
  createdAt: string;
}

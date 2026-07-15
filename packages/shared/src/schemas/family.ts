import { z } from 'zod';

export const FAMILY_ROLES = ['owner', 'caregiver'] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: FamilyRole;
  joinedAt: string;
}

export interface FamilySummary {
  id: string;
  role: FamilyRole;
  members: FamilyMember[];
  pendingInvites: { id: string; expiresAt: string }[];
}

export const acceptFamilyInviteSchema = z.object({
  token: z.string().min(32).max(256),
});

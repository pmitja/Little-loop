import { randomUUID } from 'node:crypto';
import { families, familyInvites, familyMembers, users, type Db } from '@littleloop/db';
import type { FamilyRole, FamilySummary } from '@littleloop/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { HttpError } from './http';
import { getEntitlement } from './entitlement';

export interface FamilyContext {
  familyId: string;
  ownerUserId: string;
  memberId: string;
  role: FamilyRole;
}

/** Idempotently create the personal family every account starts with. */
export async function ensurePersonalFamily(db: Db, userId: string): Promise<FamilyContext> {
  const existing = await getFamilyContext(db, userId);
  if (existing) return existing;

  const familyId = randomUUID();
  await db
    .insert(families)
    .values({ id: familyId, ownerUserId: userId })
    .onConflictDoNothing({ target: families.ownerUserId });
  const family = await db.query.families.findFirst({ where: eq(families.ownerUserId, userId) });
  if (!family) throw new HttpError(500, 'FAMILY_CREATE_FAILED', 'Could not create family');

  await db
    .insert(familyMembers)
    .values({ familyId: family.id, userId, role: 'owner' })
    .onConflictDoNothing({ target: familyMembers.userId });
  const created = await getFamilyContext(db, userId);
  if (!created) throw new HttpError(500, 'FAMILY_CREATE_FAILED', 'Could not join family');
  return created;
}

export async function getFamilyContext(db: Db, userId: string): Promise<FamilyContext | null> {
  const member = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });
  if (!member) return null;
  const family = await db.query.families.findFirst({ where: eq(families.id, member.familyId) });
  if (!family) return null;
  return {
    familyId: family.id,
    ownerUserId: family.ownerUserId,
    memberId: member.id,
    role: member.role,
  };
}

export async function requireFamilyMembership(db: Db, userId: string): Promise<FamilyContext> {
  // Account sync normally creates this row. Self-heal here as well so a newly
  // created user cannot get stranded if a family request wins the startup race,
  // or if the user was created while the schema migration was being deployed.
  const family = (await getFamilyContext(db, userId)) ?? (await ensurePersonalFamily(db, userId));
  if (family.role === 'caregiver' && !(await getEntitlement(db, userId)).isPremium) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'The main caregiver needs Premium');
  }
  return family;
}

export async function requireFamilyOwner(db: Db, userId: string): Promise<FamilyContext> {
  const family = await requireFamilyMembership(db, userId);
  if (family.role !== 'owner') {
    throw new HttpError(403, 'OWNER_REQUIRED', 'Only the main caregiver can do that');
  }
  return family;
}

export async function getFamilySummary(db: Db, userId: string): Promise<FamilySummary> {
  const family = await requireFamilyMembership(db, userId);
  const [rows, invites] = await Promise.all([
    db
      .select({
        id: familyMembers.id,
        userId: familyMembers.userId,
        email: users.email,
        role: familyMembers.role,
        joinedAt: familyMembers.joinedAt,
      })
      .from(familyMembers)
      .innerJoin(users, eq(users.id, familyMembers.userId))
      .where(eq(familyMembers.familyId, family.familyId)),
    family.role === 'owner'
      ? db.query.familyInvites.findMany({
          where: and(
            eq(familyInvites.familyId, family.familyId),
            isNull(familyInvites.acceptedAt),
            isNull(familyInvites.revokedAt),
            gt(familyInvites.expiresAt, new Date()),
          ),
          columns: { id: true, expiresAt: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    id: family.familyId,
    role: family.role,
    members: rows.map((member) => ({
      ...member,
      name: member.email.split('@')[0] || 'Caregiver',
      joinedAt: member.joinedAt.toISOString(),
    })),
    pendingInvites: invites.map((invite) => ({
      id: invite.id,
      expiresAt: invite.expiresAt.toISOString(),
    })),
  };
}

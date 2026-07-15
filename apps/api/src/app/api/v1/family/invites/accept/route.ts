import { createHash } from 'node:crypto';
import { acceptFamilyInviteSchema } from '@littleloop/shared';
import { childProfiles, families, familyInvites, familyMembers } from '@littleloop/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { ensurePersonalFamily, getFamilySummary } from '@/lib/family';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { runBatch } from '@/lib/db-batch';

export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const { token } = await parseBody(req, acceptFamilyInviteSchema);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const invite = await db.query.familyInvites.findFirst({
    where: and(
      eq(familyInvites.tokenHash, tokenHash),
      isNull(familyInvites.acceptedAt),
      isNull(familyInvites.revokedAt),
      gt(familyInvites.expiresAt, new Date()),
    ),
  });
  if (!invite) throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invitation is invalid or expired');

  const target = await db.query.families.findFirst({ where: eq(families.id, invite.familyId) });
  if (!target) throw new HttpError(404, 'FAMILY_NOT_FOUND', 'Family not found');
  if (!(await getEntitlement(db, target.ownerUserId)).isPremium) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'The main caregiver needs Premium');
  }

  const current = await ensurePersonalFamily(db, user!.id);
  if (current.familyId === target.id) {
    return json({ family: await getFamilySummary(db, user!.id) });
  }
  if (current.role !== 'owner') {
    throw new HttpError(409, 'ALREADY_IN_FAMILY', 'Leave your current family before joining another');
  }
  if ((await getEntitlement(db, user!.id)).isPremium) {
    throw new HttpError(
      409,
      'ACTIVE_SUBSCRIPTION',
      'Cancel your existing Premium subscription before joining another family',
    );
  }
  const [children, members] = await Promise.all([
    db.query.childProfiles.findMany({
      where: and(eq(childProfiles.familyId, current.familyId), isNull(childProfiles.deletedAt)),
      columns: { id: true },
    }),
    db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, current.familyId),
      columns: { id: true },
    }),
  ]);
  if (children.length > 0 || members.length > 1) {
    throw new HttpError(
      409,
      'FAMILY_HAS_DATA',
      'This account already manages a family and cannot join another one',
    );
  }

  const statements = [
    db.delete(families).where(eq(families.id, current.familyId)),
    db.insert(familyMembers).values({ familyId: target.id, userId: user!.id, role: 'caregiver' }),
    db
      .update(familyInvites)
      .set({ acceptedAt: new Date(), acceptedByUserId: user!.id })
      .where(eq(familyInvites.id, invite.id)),
  ] as const;
  await runBatch(db, statements);

  return json({ family: await getFamilySummary(db, user!.id) });
});

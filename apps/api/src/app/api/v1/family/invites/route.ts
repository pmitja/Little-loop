import { createHash, randomBytes } from 'node:crypto';
import { familyInvites } from '@littleloop/db';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { requireFamilyOwner } from '@/lib/family';
import { handle, HttpError, json } from '@/lib/http';

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyOwner(db, user!.id);
  const entitlement = await getEntitlement(db, user!.id);
  if (!entitlement.isPremium) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'Premium is required to add a caregiver');
  }

  const token = randomBytes(24).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
  const [invite] = await db
    .insert(familyInvites)
    .values({
      familyId: family.familyId,
      invitedByUserId: user!.id,
      tokenHash,
      expiresAt,
    })
    .returning({ id: familyInvites.id });

  return json({ invite: { id: invite.id, token, expiresAt: expiresAt.toISOString() } }, 201);
});

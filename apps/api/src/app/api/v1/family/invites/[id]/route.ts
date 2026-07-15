import { familyInvites } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { requireFamilyOwner } from '@/lib/family';
import { handle, HttpError, json } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyOwner(db, user!.id);
  const { id } = await params;
  const [revoked] = await db
    .update(familyInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(familyInvites.id, id),
        eq(familyInvites.familyId, family.familyId),
        isNull(familyInvites.acceptedAt),
        isNull(familyInvites.revokedAt),
      ),
    )
    .returning({ id: familyInvites.id });
  if (!revoked) throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invitation not found');
  return json({ ok: true });
});

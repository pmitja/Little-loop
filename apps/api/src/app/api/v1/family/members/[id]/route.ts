import { familyMembers } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { requireFamilyOwner } from '@/lib/family';
import { handle, HttpError, json } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyOwner(db, user!.id);
  const { id } = await params;
  const member = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, id), eq(familyMembers.familyId, family.familyId)),
  });
  if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Caregiver not found');
  if (member.role === 'owner') {
    throw new HttpError(422, 'OWNER_CANNOT_BE_REMOVED', 'The main caregiver cannot be removed');
  }
  await db.delete(familyMembers).where(eq(familyMembers.id, member.id));
  return json({ ok: true });
});

import { createChildProfileSchema } from '@littleloop/shared';
import { childProfiles } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requireChildProfile(db, user!.id, id);
  const body = await parseBody(req, createChildProfileSchema.partial());
  const [updated] = await db
    .update(childProfiles)
    .set(body)
    .where(eq(childProfiles.id, id))
    .returning();
  return json({ childProfile: updated });
});

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requireChildProfile(db, user!.id, id);
  await db
    .update(childProfiles)
    .set({ deletedAt: new Date() })
    .where(eq(childProfiles.id, id));
  return json({ ok: true });
});

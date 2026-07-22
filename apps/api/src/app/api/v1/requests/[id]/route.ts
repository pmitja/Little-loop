import { watchRequests } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Resolve a request (parent approved the channel or dismissed it). Soft — we
 * mark it resolved rather than deleting so it drops off every device's queue
 * without a hard-delete race against a concurrent sync.
 */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;

  const request = await db.query.watchRequests.findFirst({
    where: eq(watchRequests.id, id),
  });
  if (!request) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  await requireChildProfile(db, user!.id, request.childProfileId);

  await db
    .update(watchRequests)
    .set({ status: 'resolved', resolvedByUserId: user!.id })
    .where(eq(watchRequests.id, id));

  return json({ ok: true });
});

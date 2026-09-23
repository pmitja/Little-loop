import { watchSessions } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { heartbeatSchema, recordHeartbeat } from '@/lib/sessions';

type Ctx = { params: Promise<{ id: string }> };

/** Heartbeat / end: monotonic totalSeconds, capped at wall-clock +10% (PLAN §8). */
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  const body = await parseBody(req, heartbeatSchema);

  const session = await db.query.watchSessions.findFirst({ where: eq(watchSessions.id, id) });
  if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found');
  await requireChildProfile(db, user!.id, session.childProfileId); // ownership

  const updated = await recordHeartbeat(db, session, body, user!.id);
  return json({ session: { id: updated.id, totalSeconds: updated.totalSeconds } });
});

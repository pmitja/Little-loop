import { securityEvents, watchSessions } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { capTotalSeconds } from '@/lib/sessions';

type Ctx = { params: Promise<{ id: string }> };

const heartbeatSchema = z.object({
  totalSeconds: z.number().int().min(0),
  videosWatched: z
    .array(z.object({ videoMetadataId: z.string(), seconds: z.number().int().min(0) }))
    .default([]),
  endReason: z.enum(['parent_exit', 'time_limit', 'app_closed', 'unknown']).optional(),
});

/** Heartbeat / end: monotonic totalSeconds, capped at wall-clock +10% (PLAN §8). */
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  const body = await parseBody(req, heartbeatSchema);

  const session = await db.query.watchSessions.findFirst({ where: eq(watchSessions.id, id) });
  if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found');
  await requireChildProfile(db, user!.id, session.childProfileId); // ownership

  const totalSeconds = capTotalSeconds(body.totalSeconds, session.startedAt, session.totalSeconds);
  const ending = body.endReason !== undefined;

  const [updated] = await db
    .update(watchSessions)
    .set({
      totalSeconds,
      videosWatched: body.videosWatched,
      ...(ending ? { endedAt: new Date(), endReason: body.endReason } : {}),
    })
    .where(eq(watchSessions.id, id))
    .returning();

  if (ending) {
    await db.insert(securityEvents).values({
      userId: user!.id,
      deviceId: session.deviceId,
      type: 'child_mode_exit',
      metadata: { sessionId: id, endReason: body.endReason, totalSeconds },
    });
  }

  return json({ session: { id: updated.id, totalSeconds: updated.totalSeconds } });
});

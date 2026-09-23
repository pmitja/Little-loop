import { devices } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { startWatchSession } from '@/lib/sessions';

const startSchema = z.object({
  childProfileId: z.string().uuid(),
  clientSessionId: z.string().uuid().optional(),
  startedAt: z.string().datetime().optional(),
  installId: z.string().min(1).max(64),
  tzOffsetMinutes: z.number().int().min(-840).max(720).default(0),
});

/** Start a session; returns the server-computed total for today (PLAN §8/§13). */
export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const body = await parseBody(req, startSchema);
  const child = await requireChildProfile(db, user!.id, body.childProfileId);

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.userId, user!.id), eq(devices.installId, body.installId)),
    columns: { id: true },
  });

  const { status, body: result } = await startWatchSession(db, {
    childProfileId: child.id,
    dailyLimitMinutes: child.dailyLimitMinutes,
    clientSessionId: body.clientSessionId,
    startedAt: body.startedAt,
    tzOffsetMinutes: body.tzOffsetMinutes,
    deviceId: device?.id ?? null,
    actorUserId: user!.id,
  });
  return json(result, status);
});

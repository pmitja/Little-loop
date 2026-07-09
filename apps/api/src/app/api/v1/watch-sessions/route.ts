import { devices, securityEvents, watchSessions } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { secondsWatchedToday } from '@/lib/sessions';

const startSchema = z.object({
  childProfileId: z.string().uuid(),
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

  const [session] = await db
    .insert(watchSessions)
    .values({
      childProfileId: child.id,
      deviceId: device?.id,
      startedAt: new Date(),
    })
    .returning();

  await db.insert(securityEvents).values({
    userId: user!.id,
    deviceId: device?.id,
    type: 'child_mode_enter',
    metadata: { childProfileId: child.id },
  });

  return json(
    {
      sessionId: session.id,
      secondsWatchedToday: await secondsWatchedToday(db, child.id, body.tzOffsetMinutes),
      dailyLimitMinutes: child.dailyLimitMinutes,
    },
    201,
  );
});

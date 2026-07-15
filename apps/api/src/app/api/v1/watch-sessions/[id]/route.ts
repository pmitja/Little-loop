import { securityEvents, videoMetadata, watchSessions } from '@littleloop/db';
import { eq, inArray } from 'drizzle-orm';
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
  providerVideoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).optional(),
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
  let videosWatched = body.videosWatched;
  if (body.providerVideoIds?.length) {
    const metadata = await db.query.videoMetadata.findMany({
      where: inArray(videoMetadata.providerVideoId, body.providerVideoIds),
      columns: { id: true },
    });
    const secondsPerVideo = Math.floor(totalSeconds / Math.max(1, metadata.length));
    videosWatched = metadata.map((video) => ({
      videoMetadataId: video.id,
      seconds: secondsPerVideo,
    }));
  }

  const [updated] = await db
    .update(watchSessions)
    .set({
      totalSeconds,
      videosWatched,
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

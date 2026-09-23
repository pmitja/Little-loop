import { videoMetadata, watchSessions } from '@littleloop/db';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireChildDevice } from '@/lib/childDevices';
import { handle, json, parseBody } from '@/lib/http';

const finishedSchema = z.object({
  clientSessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  totalSeconds: z.number().int().min(0),
  providerVideoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).max(200).default([]),
  endReason: z.enum(['parent_exit', 'time_limit', 'app_closed', 'unknown']).default('unknown'),
});

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Kid device: record one finished viewing stretch. The device counts time
 * locally and enforces the limit itself, so the server never tracks time live:
 * one write per session, sent when the app backgrounds or the limit is hit.
 * Idempotent on clientSessionId — a re-send after a relaunch is a no-op.
 */
export const POST = handle(async (req) => {
  const { db, device, child } = await requireChildDevice(req);
  const body = await parseBody(req, finishedSchema);

  const now = Date.now();
  const endedAt = new Date(Math.min(new Date(body.endedAt).getTime(), now));
  const requestedStart = new Date(body.startedAt);
  const startedAt =
    requestedStart.getTime() >= now - MAX_AGE_MS && requestedStart <= endedAt
      ? requestedStart
      : endedAt;
  // Never more than wall-clock time +10% (PLAN §8).
  const elapsed = (endedAt.getTime() - startedAt.getTime()) / 1000;
  const totalSeconds = Math.min(body.totalSeconds, Math.ceil(elapsed * 1.1));

  const metadata = body.providerVideoIds.length
    ? await db.query.videoMetadata.findMany({
        where: inArray(videoMetadata.providerVideoId, body.providerVideoIds),
        columns: { id: true },
      })
    : [];
  const secondsPerVideo = Math.floor(totalSeconds / Math.max(1, metadata.length));

  await db
    .insert(watchSessions)
    .values({
      clientSessionId: body.clientSessionId,
      childProfileId: child.id,
      childDeviceId: device.id,
      startedAt,
      endedAt,
      totalSeconds,
      videosWatched: metadata.map((video) => ({
        videoMetadataId: video.id,
        seconds: secondsPerVideo,
      })),
      endReason: body.endReason,
    })
    .onConflictDoNothing({ target: watchSessions.clientSessionId });

  return json({ ok: true });
});

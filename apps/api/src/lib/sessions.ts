import { securityEvents, videoMetadata, watchSessions, type Db } from '@littleloop/db';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError } from './http';

/**
 * Server-side total for "today" — the anti-bypass source of truth when
 * online (reinstall/clear-data can't reset the clock). `tzOffsetMinutes` is
 * the device's offset (JS `Date#getTimezoneOffset` convention: UTC−local),
 * so day boundaries land on the child's local midnight.
 */
export async function secondsWatchedToday(
  db: Db,
  childProfileId: string,
  tzOffsetMinutes: number,
): Promise<number> {
  const now = Date.now();
  const local = new Date(now - tzOffsetMinutes * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  const midnightUtc = new Date(local.getTime() + tzOffsetMinutes * 60_000);

  const sessions = await db.query.watchSessions.findMany({
    where: and(
      eq(watchSessions.childProfileId, childProfileId),
      gte(watchSessions.startedAt, midnightUtc),
    ),
    columns: { totalSeconds: true },
  });
  return sessions.reduce((sum, s) => sum + s.totalSeconds, 0);
}

/** Cap client-reported seconds at wall-clock elapsed +10% (PLAN §8). */
export function capTotalSeconds(reported: number, startedAt: Date, previous: number): number {
  const elapsed = Math.max(0, (Date.now() - startedAt.getTime()) / 1000);
  const capped = Math.min(reported, Math.ceil(elapsed * 1.1));
  return Math.max(previous, capped); // monotonic — heartbeats never rewind
}

export interface StartSessionInput {
  childProfileId: string;
  dailyLimitMinutes: number | null;
  clientSessionId?: string;
  startedAt?: string;
  tzOffsetMinutes: number;
  /** Parent-device install row (parent phones) — null for kid devices. */
  deviceId?: string | null;
  /** Paired kid device — null for parent phones. */
  childDeviceId?: string | null;
  /** Acting caregiver for the audit event; null when a kid device starts it. */
  actorUserId: string | null;
}

/**
 * Start (or idempotently re-find) a watch session and return the server total
 * for today. Shared by the parent-session and kid-device routes.
 */
export async function startWatchSession(db: Db, input: StartSessionInput) {
  const existing = input.clientSessionId
    ? await db.query.watchSessions.findFirst({
        where: eq(watchSessions.clientSessionId, input.clientSessionId),
      })
    : null;
  if (existing) {
    if (existing.childProfileId !== input.childProfileId) {
      throw new HttpError(409, 'SESSION_ID_CONFLICT', 'Session id is already in use');
    }
    return {
      status: 200,
      body: {
        sessionId: existing.id,
        secondsWatchedToday: await secondsWatchedToday(
          db,
          input.childProfileId,
          input.tzOffsetMinutes,
        ),
        dailyLimitMinutes: input.dailyLimitMinutes,
      },
    };
  }

  const requested = input.startedAt ? new Date(input.startedAt) : new Date();
  const oldest = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const startedAt =
    requested.getTime() >= oldest && requested.getTime() <= Date.now() ? requested : new Date();

  const [session] = await db
    .insert(watchSessions)
    .values({
      childProfileId: input.childProfileId,
      clientSessionId: input.clientSessionId,
      deviceId: input.deviceId ?? undefined,
      childDeviceId: input.childDeviceId ?? undefined,
      startedAt,
    })
    .returning();

  await db.insert(securityEvents).values({
    userId: input.actorUserId,
    deviceId: input.deviceId ?? input.childDeviceId ?? undefined,
    type: 'child_mode_enter',
    metadata: {
      childProfileId: input.childProfileId,
      ...(input.childDeviceId ? { childDeviceId: input.childDeviceId } : {}),
    },
  });

  return {
    status: 201,
    body: {
      sessionId: session.id,
      secondsWatchedToday: await secondsWatchedToday(
        db,
        input.childProfileId,
        input.tzOffsetMinutes,
      ),
      dailyLimitMinutes: input.dailyLimitMinutes,
    },
  };
}

export const heartbeatSchema = z.object({
  totalSeconds: z.number().int().min(0),
  videosWatched: z
    .array(z.object({ videoMetadataId: z.string(), seconds: z.number().int().min(0) }))
    .default([]),
  providerVideoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).optional(),
  endReason: z.enum(['parent_exit', 'time_limit', 'app_closed', 'unknown']).optional(),
});

/** Heartbeat / end: monotonic totalSeconds, capped at wall-clock +10% (PLAN §8). */
export async function recordHeartbeat(
  db: Db,
  session: typeof watchSessions.$inferSelect,
  body: z.infer<typeof heartbeatSchema>,
  actorUserId: string | null,
) {
  const totalSeconds = capTotalSeconds(body.totalSeconds, session.startedAt, session.totalSeconds);
  // Devices re-send finished sessions after a relaunch; only the first end
  // closes the session and writes the audit event.
  const ending = body.endReason !== undefined && !session.endedAt;
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
    .where(eq(watchSessions.id, session.id))
    .returning();

  if (ending) {
    await db.insert(securityEvents).values({
      userId: actorUserId,
      deviceId: session.deviceId ?? session.childDeviceId,
      type: 'child_mode_exit',
      metadata: { sessionId: session.id, endReason: body.endReason, totalSeconds },
    });
  }
  return updated;
}

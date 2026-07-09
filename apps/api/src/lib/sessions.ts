import { watchSessions, type Db } from '@littleloop/db';
import { and, eq, gte } from 'drizzle-orm';

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

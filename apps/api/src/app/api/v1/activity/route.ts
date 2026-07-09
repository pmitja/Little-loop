import { videoMetadata, watchSessions } from '@littleloop/db';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

/**
 * Activity screen data (s17): today vs limit, 7-day bars, most watched,
 * session list. `tzOffsetMinutes` (JS getTimezoneOffset convention) aligns
 * day buckets to the device's local midnight.
 */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const url = new URL(req.url);
  const childProfileId = url.searchParams.get('childProfileId');
  if (!childProfileId) throw new HttpError(400, 'BAD_REQUEST', 'childProfileId is required');
  const tzOffsetMinutes = Number(url.searchParams.get('tzOffsetMinutes') ?? 0) || 0;
  const child = await requireChildProfile(db, user!.id, childProfileId);

  const toLocal = (d: Date) => new Date(d.getTime() - tzOffsetMinutes * 60_000);
  const localDayKey = (d: Date) => toLocal(d).toISOString().slice(0, 10);

  // Window: local midnight 6 days ago → now.
  const localNow = toLocal(new Date());
  const windowStartLocal = new Date(localNow);
  windowStartLocal.setUTCHours(0, 0, 0, 0);
  windowStartLocal.setUTCDate(windowStartLocal.getUTCDate() - 6);
  const windowStartUtc = new Date(windowStartLocal.getTime() + tzOffsetMinutes * 60_000);

  const sessions = await db.query.watchSessions.findMany({
    where: and(
      eq(watchSessions.childProfileId, childProfileId),
      gte(watchSessions.startedAt, windowStartUtc),
    ),
    orderBy: (t, { desc }) => [desc(t.startedAt)],
  });

  const todayKey = localDayKey(new Date());
  const weekByDay: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(localNow);
    d.setUTCDate(d.getUTCDate() - i);
    weekByDay.push({ date: d.toISOString().slice(0, 10), minutes: 0 });
  }
  const byDay = new Map(weekByDay.map((d) => [d.date, d]));

  const perVideoSeconds = new Map<string, number>();
  for (const s of sessions) {
    byDay.get(localDayKey(s.startedAt))!.minutes += Math.round(s.totalSeconds / 60);
    for (const v of s.videosWatched) {
      perVideoSeconds.set(
        v.videoMetadataId,
        (perVideoSeconds.get(v.videoMetadataId) ?? 0) + v.seconds,
      );
    }
  }

  let mostWatched: { title: string; channelTitle: string; thumbnailUrl: string; minutes: number } | null =
    null;
  if (perVideoSeconds.size > 0) {
    const [topId, topSeconds] = [...perVideoSeconds.entries()].sort((a, b) => b[1] - a[1])[0];
    const [meta] = await db
      .select()
      .from(videoMetadata)
      .where(inArray(videoMetadata.id, [topId]));
    if (meta) {
      mostWatched = {
        title: meta.title,
        channelTitle: meta.channelTitle,
        thumbnailUrl: meta.thumbnailUrl,
        minutes: Math.round(topSeconds / 60),
      };
    }
  }

  return json({
    todayMinutes: byDay.get(todayKey)?.minutes ?? 0,
    dailyLimitMinutes: child.dailyLimitMinutes,
    weekByDay,
    mostWatched,
    sessions: sessions.map((s) => ({
      id: s.id,
      startedAt: s.startedAt.toISOString(),
      minutes: Math.round(s.totalSeconds / 60),
      videosCount: s.videosWatched.length,
      endReason: s.endReason,
    })),
  });
});

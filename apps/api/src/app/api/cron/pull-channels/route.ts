import { approvedChannels, getDb } from '@littleloop/db';
import { isNull } from 'drizzle-orm';
import { errorResponse, handle, json } from '@/lib/http';
import { pullChannel } from '@/lib/channel-pull';

export const maxDuration = 300;

/** Cap channels processed per run so one cron invocation can't blow the quota. */
const MAX_CHANNELS_PER_RUN = 200;

/**
 * Nightly channel pull: every approved channel's new uploads are fetched and
 * enqueued into pending_videos for parent review (never auto-live). Cheap —
 * playlistItems.list is 1 unit/channel. Vercel cron sends the CRON_SECRET.
 */
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Bad cron secret');
  }

  const db = getDb();
  const channels = await db.query.approvedChannels.findMany({
    where: isNull(approvedChannels.deletedAt),
    orderBy: (t, { asc }) => [asc(t.lastPulledAt)], // oldest-checked first
    limit: MAX_CHANNELS_PER_RUN,
  });

  let enqueued = 0;
  let failed = 0;
  for (const channel of channels) {
    try {
      enqueued += await pullChannel(db, channel);
    } catch {
      failed += 1; // one bad channel (quota/deleted) shouldn't abort the run
    }
  }

  return json({ channels: channels.length, enqueued, failed });
});

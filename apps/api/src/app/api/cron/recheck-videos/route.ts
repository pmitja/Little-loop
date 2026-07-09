import { getDb, playlistVideos, videoMetadata } from '@littleloop/db';
import { eq, inArray, sql } from 'drizzle-orm';
import { errorResponse, handle, json } from '@/lib/http';
import { checkAvailability } from '@/lib/youtube';

export const maxDuration = 300;

/**
 * Nightly availability re-check (PLAN Phase 5): every video still referenced
 * by a playlist gets re-validated against the Data API; vanished/private/
 * non-embeddable ones are flagged `unavailable` so clients can grey them out.
 * Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Bad cron secret');
  }

  const db = getDb();
  const referenced = await db
    .selectDistinct({
      id: videoMetadata.id,
      providerVideoId: videoMetadata.providerVideoId,
    })
    .from(videoMetadata)
    .innerJoin(playlistVideos, eq(playlistVideos.videoMetadataId, videoMetadata.id));

  if (referenced.length === 0) return json({ checked: 0, unavailable: 0 });

  const available = await checkAvailability(referenced.map((v) => v.providerVideoId));
  const gone = referenced.filter((v) => !available.has(v.providerVideoId));
  const ok = referenced.filter((v) => available.has(v.providerVideoId));

  if (gone.length) {
    await db
      .update(videoMetadata)
      .set({ status: 'unavailable', lastCheckedAt: sql`now()` })
      .where(inArray(videoMetadata.id, gone.map((v) => v.id)));
  }
  if (ok.length) {
    await db
      .update(videoMetadata)
      .set({ status: 'available', lastCheckedAt: sql`now()` })
      .where(inArray(videoMetadata.id, ok.map((v) => v.id)));
  }

  return json({ checked: referenced.length, unavailable: gone.length });
});

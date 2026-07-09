import { videoMetadata, type Db } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { resolveVideo } from './youtube';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache-or-fetch metadata for one YouTube video. Cache hits skip the Data API
 * entirely (quota: 10k units/day, 1 per lookup — PLAN §9).
 */
export async function getOrFetchVideo(db: Db, providerVideoId: string) {
  const cached = await db.query.videoMetadata.findFirst({
    where: and(
      eq(videoMetadata.provider, 'youtube'),
      eq(videoMetadata.providerVideoId, providerVideoId),
    ),
  });
  const fresh =
    cached &&
    cached.status === 'available' &&
    Date.now() - cached.lastCheckedAt.getTime() < CACHE_TTL_MS;
  if (fresh) return cached;

  const resolved = await resolveVideo(providerVideoId); // throws contract errors on invalid videos
  const [row] = await db
    .insert(videoMetadata)
    .values({
      provider: 'youtube',
      providerVideoId,
      title: resolved.title,
      channelTitle: resolved.channelTitle,
      durationSeconds: resolved.durationSeconds,
      thumbnailUrl: resolved.thumbnailUrl,
      embeddable: resolved.embeddable,
      madeForKids: resolved.madeForKids,
      status: 'available',
      lastCheckedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [videoMetadata.provider, videoMetadata.providerVideoId],
      set: {
        title: resolved.title,
        channelTitle: resolved.channelTitle,
        durationSeconds: resolved.durationSeconds,
        thumbnailUrl: resolved.thumbnailUrl,
        embeddable: resolved.embeddable,
        madeForKids: resolved.madeForKids,
        status: 'available',
        lastCheckedAt: new Date(),
      },
    })
    .returning();
  return row;
}

/** Serialize a video_metadata row into the shared VideoMeta client shape. */
export function toVideoMeta(row: typeof videoMetadata.$inferSelect) {
  return {
    provider: 'youtube' as const,
    providerVideoId: row.providerVideoId,
    title: row.title,
    channelTitle: row.channelTitle,
    durationSeconds: row.durationSeconds,
    thumbnailUrl: row.thumbnailUrl,
    embeddable: row.embeddable,
  };
}

import { searchCache, videoMetadata, type Db } from '@littleloop/db';
import { and, eq, sql } from 'drizzle-orm';
import { searchVideos, type ResolvedVideo } from './youtube';

/**
 * Kids' content queries are extremely head-heavy ("peppa pig", "blippi"…), so
 * a day-long shared cache absorbs most of the 100-unit search.list cost.
 */
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type SearchResult = (typeof searchCache.$inferSelect)['results'][number];

/** Collapse whitespace + case so "Peppa  Pig " and "peppa pig" share a row. */
export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Cache-or-search for one normalized query. On a miss this spends ~101 quota
 * units, then primes video_metadata so previewing/adding a result is free.
 */
export async function getOrFetchSearch(db: Db, query: string): Promise<SearchResult[]> {
  const cached = await db.query.searchCache.findFirst({
    where: and(eq(searchCache.provider, 'youtube'), eq(searchCache.query, query)),
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  const resolved = await searchVideos(query); // throws 503 QUOTA_EXCEEDED when exhausted
  await primeVideoMetadata(db, resolved);

  const results: SearchResult[] = resolved.map((v) => ({
    providerVideoId: v.providerVideoId,
    title: v.title,
    channelTitle: v.channelTitle,
    durationSeconds: v.durationSeconds,
    thumbnailUrl: v.thumbnailUrl,
  }));
  await db
    .insert(searchCache)
    .values({ provider: 'youtube', query, results, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [searchCache.provider, searchCache.query],
      set: { results, fetchedAt: new Date() },
    });
  return results;
}

async function primeVideoMetadata(db: Db, resolved: ResolvedVideo[]) {
  if (resolved.length === 0) return;
  await db
    .insert(videoMetadata)
    .values(
      resolved.map((v) => ({
        provider: 'youtube' as const,
        providerVideoId: v.providerVideoId,
        title: v.title,
        channelTitle: v.channelTitle,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailUrl,
        embeddable: v.embeddable,
        madeForKids: v.madeForKids,
        status: 'available' as const,
        lastCheckedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: [videoMetadata.provider, videoMetadata.providerVideoId],
      set: {
        title: sql`excluded.title`,
        channelTitle: sql`excluded.channel_title`,
        durationSeconds: sql`excluded.duration_seconds`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        embeddable: sql`excluded.embeddable`,
        madeForKids: sql`excluded.made_for_kids`,
        status: 'available',
        lastCheckedAt: new Date(),
      },
    });
}

import { HttpError } from './http';

/** Parse ISO-8601 durations like PT1H2M30S → seconds. Returns null on nonsense. */
export function parseIsoDuration(iso: string): number | null {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m || (!m[1] && !m[2] && !m[3] && !m[4])) return null;
  const [, d, h, min, s] = m;
  const total =
    (Number(d) || 0) * 86_400 + (Number(h) || 0) * 3_600 + (Number(min) || 0) * 60 + (Number(s) || 0);
  return total > 0 ? total : null;
}

interface YouTubeItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    liveBroadcastContent: 'none' | 'live' | 'upcoming';
    thumbnails: Record<string, { url: string } | undefined>;
  };
  contentDetails: {
    duration: string;
    contentRating?: { ytRating?: string };
  };
  status: {
    embeddable: boolean;
    privacyStatus: 'public' | 'unlisted' | 'private';
    madeForKids?: boolean;
  };
}

export interface ResolvedVideo {
  providerVideoId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  embeddable: boolean;
  madeForKids: boolean | null;
}

function bestThumbnail(thumbs: YouTubeItem['snippet']['thumbnails'], id: string): string {
  return (
    thumbs.maxres?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  );
}

async function fetchItems(ids: string[]): Promise<YouTubeItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new HttpError(500, 'MISCONFIGURED', 'YOUTUBE_API_KEY is not set');
  const url =
    'https://www.googleapis.com/youtube/v3/videos' +
    `?part=snippet,contentDetails,status&id=${ids.join(',')}&key=${key}`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new HttpError(503, 'QUOTA_EXCEEDED', 'Video lookups are temporarily unavailable');
  }
  if (!res.ok) {
    throw new HttpError(502, 'PROVIDER_ERROR', `YouTube API error (${res.status})`);
  }
  const body = (await res.json()) as { items?: YouTubeItem[] };
  return body.items ?? [];
}

/**
 * Look up one video and validate it per PLAN §9: must exist, be public
 * (unlisted allowed), embeddable, not live, not age-restricted.
 */
export async function resolveVideo(providerVideoId: string): Promise<ResolvedVideo> {
  const [item] = await fetchItems([providerVideoId]);
  if (!item || item.status.privacyStatus === 'private') {
    throw new HttpError(404, 'VIDEO_UNAVAILABLE', 'This video is private or unavailable');
  }
  if (!item.status.embeddable) {
    throw new HttpError(404, 'NOT_EMBEDDABLE', "This video can't be played inside apps");
  }
  if (item.snippet.liveBroadcastContent !== 'none') {
    throw new HttpError(404, 'VIDEO_UNAVAILABLE', 'Live streams are not supported');
  }
  if (item.contentDetails.contentRating?.ytRating === 'ytAgeRestricted') {
    throw new HttpError(404, 'VIDEO_UNAVAILABLE', 'Age-restricted videos are not supported');
  }
  const durationSeconds = parseIsoDuration(item.contentDetails.duration);
  if (!durationSeconds) {
    throw new HttpError(404, 'VIDEO_UNAVAILABLE', 'Could not read video duration');
  }
  return {
    providerVideoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    durationSeconds,
    thumbnailUrl: bestThumbnail(item.snippet.thumbnails, providerVideoId),
    embeddable: true,
    madeForKids: item.status.madeForKids ?? null,
  };
}

/**
 * Search YouTube and return only videos that pass the same PLAN §9 gates as
 * resolveVideo (embeddable, not live, not age-restricted, real duration).
 * Quota: search.list = 100 units + one videos.list call = 1 unit, so callers
 * MUST cache results (see search-cache) — this is ~100x a preview lookup.
 */
export async function searchVideos(query: string, maxResults = 20): Promise<ResolvedVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new HttpError(500, 'MISCONFIGURED', 'YOUTUBE_API_KEY is not set');
  const url =
    'https://www.googleapis.com/youtube/v3/search' +
    `?part=id&type=video&videoEmbeddable=true&safeSearch=strict` +
    `&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new HttpError(503, 'QUOTA_EXCEEDED', 'Video search is temporarily unavailable');
  }
  if (!res.ok) {
    throw new HttpError(502, 'PROVIDER_ERROR', `YouTube API error (${res.status})`);
  }
  const body = (await res.json()) as { items?: { id?: { videoId?: string } }[] };
  const ids = (body.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const items = await fetchItems(ids);
  const results: ResolvedVideo[] = [];
  for (const item of items) {
    if (item.status.privacyStatus === 'private' || !item.status.embeddable) continue;
    if (item.snippet.liveBroadcastContent !== 'none') continue;
    if (item.contentDetails.contentRating?.ytRating === 'ytAgeRestricted') continue;
    const durationSeconds = parseIsoDuration(item.contentDetails.duration);
    if (!durationSeconds) continue;
    results.push({
      providerVideoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      durationSeconds,
      thumbnailUrl: bestThumbnail(item.snippet.thumbnails, item.id),
      embeddable: true,
      madeForKids: item.status.madeForKids ?? null,
    });
  }
  return results;
}

/**
 * Availability re-check for the nightly cron: returns the subset of `ids`
 * still available+embeddable. Missing from the response = deleted/private.
 */
export async function checkAvailability(ids: string[]): Promise<Set<string>> {
  const available = new Set<string>();
  // The videos endpoint accepts up to 50 ids per call (1 quota unit each call).
  for (let i = 0; i < ids.length; i += 50) {
    const items = await fetchItems(ids.slice(i, i + 50));
    for (const item of items) {
      if (item.status.privacyStatus !== 'private' && item.status.embeddable) {
        available.add(item.id);
      }
    }
  }
  return available;
}

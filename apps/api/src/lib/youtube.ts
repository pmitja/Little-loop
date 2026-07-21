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
    channelId: string;
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
  statistics?: { viewCount?: string };
}

export interface ResolvedVideo {
  providerVideoId: string;
  title: string;
  channelId: string;
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
    `?part=snippet,contentDetails,status,statistics&id=${ids.join(',')}&key=${key}`;
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
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    durationSeconds,
    thumbnailUrl: bestThumbnail(item.snippet.thumbnails, providerVideoId),
    embeddable: true,
    madeForKids: item.status.madeForKids ?? null,
  };
}

interface YouTubeChannel {
  id: string;
  snippet: { title: string };
  contentDetails: { relatedPlaylists: { uploads?: string } };
}

export interface ResolvedChannel {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string | null;
}

/** Resolve a channel's title + uploads playlist (the UU… list). Quota: 1 unit. */
export async function resolveChannel(channelId: string): Promise<ResolvedChannel> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new HttpError(500, 'MISCONFIGURED', 'YOUTUBE_API_KEY is not set');
  const url =
    'https://www.googleapis.com/youtube/v3/channels' +
    `?part=snippet,contentDetails&id=${channelId}&key=${key}`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new HttpError(503, 'QUOTA_EXCEEDED', 'Channel lookups are temporarily unavailable');
  }
  if (!res.ok) {
    throw new HttpError(502, 'PROVIDER_ERROR', `YouTube API error (${res.status})`);
  }
  const body = (await res.json()) as { items?: YouTubeChannel[] };
  const channel = body.items?.[0];
  if (!channel) {
    throw new HttpError(404, 'VIDEO_UNAVAILABLE', 'That channel could not be found');
  }
  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads ?? null,
  };
}

export interface ChannelUpload extends ResolvedVideo {
  publishedAt: Date | null;
  viewCount: number;
}

/**
 * Recent playable uploads for a channel, newest first, published after
 * `publishedAfter`. Quota: playlistItems.list (1 unit) + videos.list (1 unit
 * per 50) — cheap, but callers still cap volume per run.
 */
export async function fetchChannelUploads(
  uploadsPlaylistId: string,
  publishedAfter?: Date | null,
  maxResults = 25,
): Promise<ChannelUpload[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new HttpError(500, 'MISCONFIGURED', 'YOUTUBE_API_KEY is not set');
  const url =
    'https://www.googleapis.com/youtube/v3/playlistItems' +
    `?part=contentDetails&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${key}`;
  const res = await fetch(url);
  if (res.status === 403) {
    throw new HttpError(503, 'QUOTA_EXCEEDED', 'Channel uploads are temporarily unavailable');
  }
  if (!res.ok) {
    throw new HttpError(502, 'PROVIDER_ERROR', `YouTube API error (${res.status})`);
  }
  const body = (await res.json()) as {
    items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string } }[];
  };
  const publishedById = new Map<string, string | undefined>();
  for (const item of body.items ?? []) {
    const id = item.contentDetails?.videoId;
    if (id) publishedById.set(id, item.contentDetails?.videoPublishedAt);
  }
  // Drop anything at or before the watermark before spending a videos.list unit.
  const ids = [...publishedById.keys()].filter((id) => {
    const at = publishedById.get(id);
    if (publishedAfter && at) return new Date(at).getTime() > publishedAfter.getTime();
    return true;
  });
  if (ids.length === 0) return [];

  const items = await fetchItems(ids);
  const results: ChannelUpload[] = [];
  for (const item of items) {
    if (item.status.privacyStatus === 'private' || !item.status.embeddable) continue;
    if (item.snippet.liveBroadcastContent !== 'none') continue;
    if (item.contentDetails.contentRating?.ytRating === 'ytAgeRestricted') continue;
    const durationSeconds = parseIsoDuration(item.contentDetails.duration);
    if (!durationSeconds) continue;
    const at = publishedById.get(item.id);
    results.push({
      providerVideoId: item.id,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      durationSeconds,
      thumbnailUrl: bestThumbnail(item.snippet.thumbnails, item.id),
      embeddable: true,
      madeForKids: item.status.madeForKids ?? null,
      publishedAt: at ? new Date(at) : null,
      viewCount: Number(item.statistics?.viewCount ?? 0),
    });
  }
  results.sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
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

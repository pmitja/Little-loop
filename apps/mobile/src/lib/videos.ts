import {
  VIDEO_ERROR_CODES,
  extractYouTubeId,
  type VideoErrorCode,
  type VideoMeta,
} from '@littleloop/shared';
import { api, ApiError, apiConfigured } from '@/lib/api';

export class VideoPreviewError extends Error {
  constructor(
    public code: VideoErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** User-facing copy for every preview failure (PLAN §15). */
export const VIDEO_ERROR_MESSAGES: Record<VideoErrorCode, string> = {
  INVALID_LINK: "That doesn't look like a video link",
  VIDEO_UNAVAILABLE: 'This video is private or unavailable',
  NOT_EMBEDDABLE:
    "This video can't be played inside apps — it can only be watched on the platform's own site",
  DUPLICATE_VIDEO: 'This video is already in the playlist',
  QUOTA_EXCEEDED: 'Video preview is temporarily busy — try again in a few minutes',
  OFFLINE: "You're offline — connect to the internet to add videos",
  PREMIUM_REQUIRED: 'Searching YouTube is a Premium feature — paste a video link instead',
};

/**
 * Resolve a pasted link into approved-video metadata.
 * Uses POST /videos/preview when the API is configured; otherwise falls back to
 * YouTube's keyless oEmbed endpoint (title/channel/thumbnail — no duration, which
 * the player reports at playback time instead).
 */
export async function previewVideo(url: string): Promise<VideoMeta> {
  const providerVideoId = extractYouTubeId(url);
  if (!providerVideoId) {
    throw new VideoPreviewError(
      VIDEO_ERROR_CODES.invalidLink,
      VIDEO_ERROR_MESSAGES.INVALID_LINK,
    );
  }

  if (apiConfigured()) {
    try {
      return await api<VideoMeta>('/videos/preview', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const code = (
          err.code in VIDEO_ERROR_MESSAGES ? err.code : VIDEO_ERROR_CODES.unavailable
        ) as VideoErrorCode;
        throw new VideoPreviewError(code, VIDEO_ERROR_MESSAGES[code]);
      }
      throw new VideoPreviewError(VIDEO_ERROR_CODES.offline, VIDEO_ERROR_MESSAGES.OFFLINE);
    }
  }

  return previewViaOEmbed(providerVideoId);
}

/** Search is API-only (no keyless fallback) — hide the affordance without it. */
export function searchAvailable(): boolean {
  return apiConfigured();
}

interface SearchResponse {
  results: {
    providerVideoId: string;
    title: string;
    channelTitle: string;
    durationSeconds: number;
    thumbnailUrl: string;
  }[];
}

/**
 * Search YouTube through the API (auth + shared server-side cache). Every
 * result already passed the same playability gates as a link preview.
 */
export async function searchVideos(query: string): Promise<VideoMeta[]> {
  let body: SearchResponse;
  try {
    body = await api<SearchResponse>(`/videos/search?q=${encodeURIComponent(query.trim())}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === VIDEO_ERROR_CODES.quotaExceeded) {
        throw new VideoPreviewError(
          VIDEO_ERROR_CODES.quotaExceeded,
          'Search is busy right now — paste a video link instead, or try again later',
        );
      }
      // Server backstop for a client whose cached entitlement says premium (§12).
      if (err.code === VIDEO_ERROR_CODES.premiumRequired) {
        throw new VideoPreviewError(
          VIDEO_ERROR_CODES.premiumRequired,
          VIDEO_ERROR_MESSAGES.PREMIUM_REQUIRED,
        );
      }
      throw new VideoPreviewError(VIDEO_ERROR_CODES.unavailable, err.message);
    }
    throw new VideoPreviewError(VIDEO_ERROR_CODES.offline, VIDEO_ERROR_MESSAGES.OFFLINE);
  }
  return body.results.map((r) => ({
    provider: 'youtube' as const,
    providerVideoId: r.providerVideoId,
    title: r.title,
    channelTitle: r.channelTitle,
    durationSeconds: r.durationSeconds,
    thumbnailUrl: r.thumbnailUrl,
    embeddable: true,
  }));
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

async function previewViaOEmbed(providerVideoId: string): Promise<VideoMeta> {
  const watchUrl = `https://www.youtube.com/watch?v=${providerVideoId}`;
  let res: Response;
  try {
    res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    );
  } catch {
    throw new VideoPreviewError(VIDEO_ERROR_CODES.offline, VIDEO_ERROR_MESSAGES.OFFLINE);
  }

  if (!res.ok) {
    // oEmbed status mapping: 401 = embedding disabled, 400/404 = invalid/private/deleted.
    const code =
      res.status === 401 || res.status === 403
        ? VIDEO_ERROR_CODES.notEmbeddable
        : VIDEO_ERROR_CODES.unavailable;
    throw new VideoPreviewError(code, VIDEO_ERROR_MESSAGES[code]);
  }

  const body = (await res.json()) as OEmbedResponse;
  return {
    provider: 'youtube',
    providerVideoId,
    title: body.title,
    channelTitle: body.author_name,
    durationSeconds: null,
    thumbnailUrl:
      body.thumbnail_url ?? `https://i.ytimg.com/vi/${providerVideoId}/hqdefault.jpg`,
    embeddable: true,
  };
}

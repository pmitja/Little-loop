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

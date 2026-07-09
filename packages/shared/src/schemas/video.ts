import { z } from 'zod';

/** Metadata for one approved video, as returned by POST /videos/preview. */
export const videoMetaSchema = z.object({
  provider: z.literal('youtube').default('youtube'),
  providerVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1),
  channelTitle: z.string(),
  /** Null when the metadata source can't report it (oEmbed fallback without the Data API). */
  durationSeconds: z.number().int().positive().nullable(),
  thumbnailUrl: z.string().url(),
  embeddable: z.boolean().default(true),
});

export type VideoMeta = z.infer<typeof videoMetaSchema>;

/** One entry in a child's playlist (client shape; server adds ownership). */
export interface PlaylistVideo {
  id: string;
  video: VideoMeta;
  addedAt: string;
}

export const previewRequestSchema = z.object({ url: z.string().min(1) });

/** Error codes shared between the API contract and the client-side fallback. */
export const VIDEO_ERROR_CODES = {
  invalidLink: 'INVALID_LINK',
  unavailable: 'VIDEO_UNAVAILABLE',
  notEmbeddable: 'NOT_EMBEDDABLE',
  duplicate: 'DUPLICATE_VIDEO',
  quotaExceeded: 'QUOTA_EXCEEDED',
  offline: 'OFFLINE',
} as const;

export type VideoErrorCode = (typeof VIDEO_ERROR_CODES)[keyof typeof VIDEO_ERROR_CODES];

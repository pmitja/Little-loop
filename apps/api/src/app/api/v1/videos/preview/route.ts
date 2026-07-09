import { extractYouTubeId, previewRequestSchema } from '@littleloop/shared';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { getOrFetchVideo, toVideoMeta } from '@/lib/video-cache';

/** Resolve a pasted link into approved-video metadata (PLAN §8). */
export const POST = handle(async (req) => {
  const { db } = await requireAuth(req, { limitPerMinute: 20 });
  const { url } = await parseBody(req, previewRequestSchema);

  const providerVideoId = extractYouTubeId(url);
  if (!providerVideoId) {
    throw new HttpError(422, 'INVALID_LINK', "That doesn't look like a video link");
  }

  const video = await getOrFetchVideo(db, providerVideoId);
  return json(toVideoMeta(video));
});

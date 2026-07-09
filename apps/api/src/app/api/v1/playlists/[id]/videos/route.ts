import { FREE_LIMITS, videoMetaSchema } from '@littleloop/shared';
import { playlistVideos, securityEvents } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requirePlaylist } from '@/lib/ownership';
import { getOrFetchVideo, toVideoMeta } from '@/lib/video-cache';

type Ctx = { params: Promise<{ id: string }> };

/** Ordered videos + metadata — powers both s11 and child home (PLAN §8). */
export const GET = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePlaylist(db, user!.id, id);

  const rows = await db.query.playlistVideos.findMany({
    where: eq(playlistVideos.playlistId, id),
    orderBy: (t, { asc }) => [asc(t.position)],
    with: { video: true },
  });
  return json({
    videos: rows.map((r) => ({
      id: r.id,
      position: r.position,
      addedAt: r.approvedAt.toISOString(),
      video: toVideoMeta(r.video),
    })),
  });
});

const addVideoSchema = videoMetaSchema.pick({ providerVideoId: true });

/**
 * Approve & add. The server re-resolves metadata from cache/YouTube — the
 * client never submits titles (PLAN §8).
 */
export const POST = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePlaylist(db, user!.id, id);
  const { providerVideoId } = await parseBody(req, addVideoSchema);

  const video = await getOrFetchVideo(db, providerVideoId);

  const existing = await db.query.playlistVideos.findMany({
    where: eq(playlistVideos.playlistId, id),
    columns: { videoMetadataId: true, position: true },
  });
  if (existing.some((v) => v.videoMetadataId === video.id)) {
    throw new HttpError(409, 'DUPLICATE_VIDEO', 'This video is already in the playlist');
  }
  if (existing.length >= FREE_LIMITS.videosPerPlaylist) {
    const { isPremium } = await getEntitlement(db, user!.id);
    if (!isPremium) {
      throw new HttpError(402, 'LIMIT_REACHED', 'Upgrade to add more than 10 videos');
    }
  }

  const position = existing.reduce((max, v) => Math.max(max, v.position + 1), 0);
  const [added] = await db
    .insert(playlistVideos)
    .values({ playlistId: id, videoMetadataId: video.id, position, approvedByUserId: user!.id })
    .returning();

  await db.insert(securityEvents).values({
    userId: user!.id,
    type: 'video_approved',
    metadata: { playlistId: id, providerVideoId },
  });

  return json(
    { playlistVideo: { id: added.id, position: added.position, video: toVideoMeta(video) } },
    201,
  );
});

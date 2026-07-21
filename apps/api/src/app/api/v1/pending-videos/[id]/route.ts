import { pendingVideos, playlistVideos, securityEvents } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requirePlaylist } from '@/lib/ownership';
import { toVideoMeta } from '@/lib/video-cache';

type Ctx = { params: Promise<{ id: string }> };

async function requirePending(db: Awaited<ReturnType<typeof requireAuth>>['db'], userId: string, id: string) {
  const pending = await db.query.pendingVideos.findFirst({
    where: eq(pendingVideos.id, id),
    with: { video: true },
  });
  if (!pending) throw new HttpError(404, 'NOT_FOUND', 'Pending video not found');
  await requirePlaylist(db, userId, pending.playlistId); // ownership via the child's playlist
  return pending;
}

/** Approve a pending upload → it becomes a live playlist video. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  const pending = await requirePending(db, user!.id, id);

  const existing = await db.query.playlistVideos.findMany({
    where: eq(playlistVideos.playlistId, pending.playlistId),
    columns: { videoMetadataId: true, position: true },
  });
  if (!existing.some((v) => v.videoMetadataId === pending.videoMetadataId)) {
    const position = existing.reduce((max, v) => Math.max(max, v.position + 1), 0);
    await db.insert(playlistVideos).values({
      playlistId: pending.playlistId,
      videoMetadataId: pending.videoMetadataId,
      position,
      approvedByUserId: user!.id,
    });
    await db.insert(securityEvents).values({
      userId: user!.id,
      type: 'video_approved',
      metadata: { playlistId: pending.playlistId, providerVideoId: pending.video.providerVideoId, source: 'channel' },
    });
  }

  await db.delete(pendingVideos).where(eq(pendingVideos.id, id));
  return json({ approved: true, video: toVideoMeta(pending.video) });
});

/** Reject a pending upload. The channel watermark prevents re-pulling it. */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePending(db, user!.id, id);
  await db.delete(pendingVideos).where(eq(pendingVideos.id, id));
  return json({ ok: true });
});

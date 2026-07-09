import { playlistVideos, securityEvents } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requirePlaylist } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string; playlistVideoId: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id, playlistVideoId } = await params;
  await requirePlaylist(db, user!.id, id);

  const [removed] = await db
    .delete(playlistVideos)
    .where(and(eq(playlistVideos.id, playlistVideoId), eq(playlistVideos.playlistId, id)))
    .returning();
  if (!removed) throw new HttpError(404, 'NOT_FOUND', 'Video not found in playlist');

  await db.insert(securityEvents).values({
    userId: user!.id,
    type: 'video_removed',
    metadata: { playlistId: id, videoMetadataId: removed.videoMetadataId },
  });
  return json({ ok: true });
});

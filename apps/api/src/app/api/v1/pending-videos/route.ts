import { pendingVideos, playlists } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { toVideoMeta } from '@/lib/video-cache';

/** Auto-pulled channel uploads awaiting a parent's review, newest first. */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const childProfileId = new URL(req.url).searchParams.get('childProfileId');
  if (!childProfileId) throw new HttpError(422, 'INVALID_QUERY', 'childProfileId is required');
  await requireChildProfile(db, user!.id, childProfileId);

  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.childProfileId, childProfileId), isNull(playlists.deletedAt)),
    columns: { id: true },
  });
  if (!playlist) return json({ pending: [] });

  const rows = await db.query.pendingVideos.findMany({
    where: eq(pendingVideos.playlistId, playlist.id),
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
    with: { video: true, approvedChannel: true },
  });
  return json({
    pending: rows.map((r) => ({
      id: r.id,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      channelTitle: r.approvedChannel?.channelTitle ?? r.video.channelTitle,
      video: toVideoMeta(r.video),
    })),
  });
});

import { playlists, playlistVideos } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { requireChildDevice } from '@/lib/childDevices';
import { handle, json } from '@/lib/http';
import { listPendingRequests } from '@/lib/requests';
import { secondsWatchedToday } from '@/lib/sessions';
import { toVideoMeta } from '@/lib/video-cache';

function tzOffset(req: Request): number {
  const raw = Number(new URL(req.url).searchParams.get('tzOffsetMinutes') ?? 0);
  return Number.isInteger(raw) && raw >= -840 && raw <= 720 ? raw : 0;
}

/**
 * Everything a kid device needs in one call: its child's profile and rules,
 * the approved playlist, pending requests and the cross-device total watched
 * today. Polled on launch, on foreground and about once a minute.
 */
export const GET = handle(async (req) => {
  const { db, device, child } = await requireChildDevice(req);

  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.childProfileId, child.id), isNull(playlists.deletedAt)),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  const [videos, requests, watched] = await Promise.all([
    playlist
      ? db.query.playlistVideos.findMany({
          where: eq(playlistVideos.playlistId, playlist.id),
          orderBy: (t, { asc }) => [asc(t.position)],
          with: { video: true },
        })
      : Promise.resolve([]),
    listPendingRequests(db, child.id),
    secondsWatchedToday(db, child.id, tzOffset(req)),
  ]);

  return json({
    device: { id: device.id, name: device.name },
    childProfile: child,
    playlist: playlist
      ? {
          id: playlist.id,
          videos: videos
            .filter((r) => r.video.status === 'available')
            .map((r) => ({
              id: r.id,
              position: r.position,
              addedAt: r.approvedAt.toISOString(),
              video: toVideoMeta(r.video),
            })),
        }
      : null,
    requests,
    secondsWatchedToday: watched,
  });
});

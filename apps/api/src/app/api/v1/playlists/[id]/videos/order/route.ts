import { playlistVideos } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requirePlaylist } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

const orderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });

/** Reorder: orderedIds must be a permutation of the current set (PLAN §8). */
export const PUT = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePlaylist(db, user!.id, id);
  const { orderedIds } = await parseBody(req, orderSchema);

  const current = await db.query.playlistVideos.findMany({
    where: eq(playlistVideos.playlistId, id),
    columns: { id: true },
  });
  const currentIds = new Set(current.map((v) => v.id));
  const isPermutation =
    orderedIds.length === currentIds.size && orderedIds.every((oid) => currentIds.has(oid));
  if (!isPermutation) {
    throw new HttpError(422, 'STALE_ORDER', 'Order does not match the current playlist — refresh');
  }

  // Neon's HTTP driver has no interactive transactions; batch() runs these
  // statements atomically in a single request instead.
  const updates = orderedIds.map((videoId, position) =>
    db.update(playlistVideos).set({ position }).where(eq(playlistVideos.id, videoId)),
  );
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);

  return json({ ok: true });
});

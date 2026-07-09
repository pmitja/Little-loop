import { playlists } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/http';
import { requirePlaylist } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePlaylist(db, user!.id, id);
  const body = await parseBody(req, z.object({ name: z.string().trim().min(1).max(60) }));
  const [updated] = await db
    .update(playlists)
    .set({ name: body.name })
    .where(eq(playlists.id, id))
    .returning();
  return json({ playlist: updated });
});

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;
  await requirePlaylist(db, user!.id, id);
  await db.update(playlists).set({ deletedAt: new Date() }).where(eq(playlists.id, id));
  return json({ ok: true });
});

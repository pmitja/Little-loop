import { approvedChannels } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

/** Stop following a channel. Soft-delete keeps the published watermark for audit. */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { db, user } = await requireAuth(req);
  const { id } = await params;

  const channel = await db.query.approvedChannels.findFirst({
    where: and(eq(approvedChannels.id, id), isNull(approvedChannels.deletedAt)),
  });
  if (!channel) throw new HttpError(404, 'NOT_FOUND', 'Channel not found');
  await requireChildProfile(db, user!.id, channel.childProfileId);

  await db
    .update(approvedChannels)
    .set({ deletedAt: new Date() })
    .where(eq(approvedChannels.id, id));

  return json({ ok: true });
});

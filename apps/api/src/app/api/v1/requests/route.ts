import { watchRequests } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

/** Cap pending requests per child so a bored kid can't flood the parent queue. */
const MAX_PENDING_PER_CHILD = 10;

function childIdFromQuery(req: Request): string {
  const childProfileId = new URL(req.url).searchParams.get('childProfileId');
  if (!childProfileId) throw new HttpError(422, 'INVALID_QUERY', 'childProfileId is required');
  return childProfileId;
}

function toDto(row: typeof watchRequests.$inferSelect) {
  return {
    id: row.id,
    childProfileId: row.childProfileId,
    kind: row.kind,
    channelTitle: row.channelTitle ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    sampleVideoId: row.sampleVideoId ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Pending "want more" requests for one child, shared across the family's devices. */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const childProfileId = childIdFromQuery(req);
  await requireChildProfile(db, user!.id, childProfileId);

  const rows = await db.query.watchRequests.findMany({
    where: and(
      eq(watchRequests.childProfileId, childProfileId),
      eq(watchRequests.status, 'pending'),
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return json({ requests: rows.map(toDto) });
});

const createSchema = z.object({
  childProfileId: z.string().uuid(),
  kind: z.enum(['more', 'channel']),
  channelTitle: z.string().max(200).optional(),
  thumbnailUrl: z.string().url().max(2000).optional(),
  sampleVideoId: z.string().max(64).optional(),
});

/**
 * Raise a "want more" request (heart-tap or the want-more screen). Coalesced so
 * repeat asks stay tidy: one pending 'more' per child, one pending row per
 * channel — matching the mobile store's local coalescing.
 */
export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req, { limitPerMinute: 40 });
  const body = await parseBody(req, createSchema);
  await requireChildProfile(db, user!.id, body.childProfileId);

  const pending = await db.query.watchRequests.findMany({
    where: and(
      eq(watchRequests.childProfileId, body.childProfileId),
      eq(watchRequests.status, 'pending'),
    ),
  });

  const duplicate = pending.find(
    (r) => r.kind === body.kind && (body.kind === 'more' || r.channelTitle === body.channelTitle),
  );
  if (duplicate) {
    const [touched] = await db
      .update(watchRequests)
      .set({ updatedAt: new Date() })
      .where(eq(watchRequests.id, duplicate.id))
      .returning();
    return json({ request: toDto(touched) }, 200);
  }

  if (pending.length >= MAX_PENDING_PER_CHILD) {
    throw new HttpError(409, 'REQUEST_LIMIT', 'Too many pending requests');
  }

  const [row] = await db
    .insert(watchRequests)
    .values({
      childProfileId: body.childProfileId,
      kind: body.kind,
      channelTitle: body.channelTitle,
      thumbnailUrl: body.thumbnailUrl,
      sampleVideoId: body.sampleVideoId,
    })
    .returning();

  return json({ request: toDto(row) }, 201);
});

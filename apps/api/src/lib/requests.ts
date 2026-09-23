import { watchRequests, type Db } from '@littleloop/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError } from './http';

/** Cap pending requests per child so a bored kid can't flood the parent queue. */
const MAX_PENDING_PER_CHILD = 10;

export function toRequestDto(row: typeof watchRequests.$inferSelect) {
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

export async function listPendingRequests(db: Db, childProfileId: string) {
  const rows = await db.query.watchRequests.findMany({
    where: and(
      eq(watchRequests.childProfileId, childProfileId),
      eq(watchRequests.status, 'pending'),
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return rows.map(toRequestDto);
}

export const raiseRequestSchema = z.object({
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
export async function raiseWatchRequest(
  db: Db,
  childProfileId: string,
  body: z.infer<typeof raiseRequestSchema>,
) {
  const pending = await db.query.watchRequests.findMany({
    where: and(
      eq(watchRequests.childProfileId, childProfileId),
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
    return { status: 200, request: toRequestDto(touched) };
  }

  if (pending.length >= MAX_PENDING_PER_CHILD) {
    throw new HttpError(409, 'REQUEST_LIMIT', 'Too many pending requests');
  }

  const [row] = await db
    .insert(watchRequests)
    .values({
      childProfileId,
      kind: body.kind,
      channelTitle: body.channelTitle,
      thumbnailUrl: body.thumbnailUrl,
      sampleVideoId: body.sampleVideoId,
    })
    .returning();
  return { status: 201, request: toRequestDto(row) };
}

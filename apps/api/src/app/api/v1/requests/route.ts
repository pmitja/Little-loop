import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { listPendingRequests, raiseRequestSchema, raiseWatchRequest } from '@/lib/requests';

function childIdFromQuery(req: Request): string {
  const childProfileId = new URL(req.url).searchParams.get('childProfileId');
  if (!childProfileId) throw new HttpError(422, 'INVALID_QUERY', 'childProfileId is required');
  return childProfileId;
}

/** Pending "want more" requests for one child, shared across the family's devices. */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const childProfileId = childIdFromQuery(req);
  await requireChildProfile(db, user!.id, childProfileId);
  return json({ requests: await listPendingRequests(db, childProfileId) });
});

const createSchema = raiseRequestSchema.extend({ childProfileId: z.string().uuid() });

/** Raise a "want more" request from a parent device running child mode. */
export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req, { limitPerMinute: 40 });
  const { childProfileId, ...body } = await parseBody(req, createSchema);
  await requireChildProfile(db, user!.id, childProfileId);
  const { status, request } = await raiseWatchRequest(db, childProfileId, body);
  return json({ request }, status);
});

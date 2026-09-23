import { requireChildDevice } from '@/lib/childDevices';
import { handle, json, parseBody } from '@/lib/http';
import { raiseRequestSchema, raiseWatchRequest } from '@/lib/requests';

/** Kid device: raise a "want more" request for its own child. */
export const POST = handle(async (req) => {
  const { db, child } = await requireChildDevice(req, { limitPerMinute: 40 });
  const body = await parseBody(req, raiseRequestSchema);
  const { status, request } = await raiseWatchRequest(db, child.id, body);
  return json({ request }, status);
});

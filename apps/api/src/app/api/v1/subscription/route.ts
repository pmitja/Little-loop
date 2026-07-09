import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { handle, json } from '@/lib/http';

export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  return json({ entitlement: await getEntitlement(db, user!.id) });
});

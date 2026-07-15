import { requireAuth } from '@/lib/auth';
import { getFamilySummary } from '@/lib/family';
import { handle, json } from '@/lib/http';

export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  return json({ family: await getFamilySummary(db, user!.id) });
});

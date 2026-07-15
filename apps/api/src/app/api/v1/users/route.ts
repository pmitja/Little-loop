import { users } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { deleteClerkUser, requireAuth } from '@/lib/auth';
import { handle, json } from '@/lib/http';

/**
 * Account deletion (Apple requirement, PLAN Phase 5). Deleting the owner also
 * deletes their family; deleting a caregiver only removes that membership.
 * Store purchases remain managed through the store account.
 */
export const DELETE = handle(async (req) => {
  const ctx = await requireAuth(req, { allowUnsynced: true, limitPerMinute: 5 });
  if (ctx.user) {
    await ctx.db.delete(users).where(eq(users.id, ctx.user.id));
  }
  await deleteClerkUser(ctx.clerkId);
  return json({ deleted: true });
});

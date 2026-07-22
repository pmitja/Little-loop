import { deleteAuthUser, requireAuth } from '@/lib/auth';
import { handle, json } from '@/lib/http';

/**
 * Account deletion (Apple requirement, PLAN Phase 5). Deleting the better-auth
 * identity cascades through `users.authUserId` to the app user row and its
 * whole graph (family, profiles, playlists, …). Deleting the owner also deletes
 * their family; deleting a caregiver only removes that membership. Store
 * purchases remain managed through the store account.
 */
export const DELETE = handle(async (req) => {
  const ctx = await requireAuth(req, { allowUnsynced: true, limitPerMinute: 5 });
  await deleteAuthUser(ctx.db, ctx.authUserId);
  return json({ deleted: true });
});

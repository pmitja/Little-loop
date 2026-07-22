import { authUser, getDb, users, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { auth } from './betterAuth';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';

export interface AuthContext {
  db: Db;
  /** Row from `users` — null only when `allowUnsynced` and the user hasn't hit /users/sync yet. */
  user: typeof users.$inferSelect | null;
  /** better-auth user id (the identity the RevenueCat app-user-id is tied to). */
  authUserId: string;
  /** Primary email from the better-auth session. */
  email: string;
}

interface SessionIdentity {
  authUserId: string;
  email: string;
}

/** Validate the better-auth session and return its user id + email. */
async function verifySession(req: Request): Promise<SessionIdentity> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Missing or invalid session');
  }
  return { authUserId: session.user.id, email: session.user.email ?? '' };
}

/**
 * Auth for every /api/v1 route: validate the session, rate-limit per user,
 * resolve the users row. Ownership scoping happens in each route via
 * `ctx.user.id`.
 */
export async function requireAuth(
  req: Request,
  opts: { allowUnsynced?: boolean; limitPerMinute?: number } = {},
): Promise<AuthContext> {
  const { authUserId, email } = await verifySession(req);
  rateLimit(`user:${authUserId}`, opts.limitPerMinute ?? 120);
  const db = getDb();
  const user = (await db.query.users.findFirst({ where: eq(users.authUserId, authUserId) })) ?? null;
  if (!user && !opts.allowUnsynced) {
    throw new HttpError(401, 'USER_NOT_SYNCED', 'Call POST /api/v1/users/sync first');
  }
  return { db, user, authUserId, email };
}

/**
 * Delete the better-auth identity (account deletion, PLAN Phase 5). Deleting
 * the `authUser` row cascades through `users.authUserId` to the app user row
 * and its entire graph (families, profiles, playlists, …), so this single
 * delete erases everything. Sessions and OAuth accounts cascade too.
 */
export async function deleteAuthUser(db: Db, authUserId: string): Promise<void> {
  await db.delete(authUser).where(eq(authUser.id, authUserId));
}

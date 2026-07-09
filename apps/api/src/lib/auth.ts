import { createClerkClient, verifyToken } from '@clerk/backend';
import { getDb, users, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';

export interface AuthContext {
  db: Db;
  /** Row from `users` — null only when `allowUnsynced` and the user hasn't hit /users/sync yet. */
  user: typeof users.$inferSelect | null;
  clerkId: string;
}

/** Verify the Clerk JWT and return its clerkId (sub). */
async function verifyBearer(req: Request): Promise<string> {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new HttpError(500, 'MISCONFIGURED', 'CLERK_SECRET_KEY is not set');
  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub;
  } catch {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired token');
  }
}

/**
 * Auth for every /api/v1 route: verify JWT, rate-limit per user, resolve the
 * users row. Ownership scoping happens in each route via `ctx.user.id`.
 */
export async function requireAuth(
  req: Request,
  opts: { allowUnsynced?: boolean; limitPerMinute?: number } = {},
): Promise<AuthContext> {
  const clerkId = await verifyBearer(req);
  rateLimit(`user:${clerkId}`, opts.limitPerMinute ?? 120);
  const db = getDb();
  const user = (await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })) ?? null;
  if (!user && !opts.allowUnsynced) {
    throw new HttpError(401, 'USER_NOT_SYNCED', 'Call POST /api/v1/users/sync first');
  }
  return { db, user, clerkId };
}

/** Delete the Clerk user (account deletion, PLAN Phase 5). */
export async function deleteClerkUser(clerkId: string): Promise<void> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new HttpError(500, 'MISCONFIGURED', 'CLERK_SECRET_KEY is not set');
  const clerk = createClerkClient({ secretKey });
  await clerk.users.deleteUser(clerkId);
}

/** Fetch the user's primary email from Clerk (used once, at first sync). */
export async function fetchClerkEmail(clerkId: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return '';
  try {
    const clerk = createClerkClient({ secretKey });
    const u = await clerk.users.getUser(clerkId);
    return (
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      ''
    );
  } catch {
    return '';
  }
}

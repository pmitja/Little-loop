import { getDb, subscriptionStatus, users } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { errorResponse, handle, json } from '@/lib/http';
import { mapEvent, type RcEvent } from '@/lib/revenuecat';

/**
 * RevenueCat webhook (PLAN §12). Auth: RevenueCat sends the configured
 * secret verbatim in the Authorization header. Idempotent: skips events
 * older than the last one applied.
 */
export const POST = handle(async (req) => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret || req.headers.get('authorization') !== secret) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Bad webhook secret');
  }

  const body = (await req.json()) as { event?: RcEvent };
  const event = body.event;
  if (!event?.app_user_id) {
    return errorResponse(400, 'BAD_REQUEST', 'Missing event.app_user_id');
  }
  // Purchases.logIn(authUserId) makes app_user_id == our better-auth user id.
  // Anonymous RevenueCat ids ($RCAnonymousID:…) can't be attributed — ack + skip.
  if (event.app_user_id.startsWith('$RCAnonymousID')) {
    return json({ ok: true, skipped: 'anonymous_app_user_id' });
  }

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.authUserId, event.app_user_id) });
  if (!user) return json({ ok: true, skipped: 'unknown_user' });

  const mapped = mapEvent(event);
  const existing = await db.query.subscriptionStatus.findFirst({
    where: eq(subscriptionStatus.userId, user.id),
  });
  if (existing?.lastEventAt && mapped.lastEventAt <= existing.lastEventAt) {
    return json({ ok: true, skipped: 'stale_event' });
  }

  const values = {
    ...mapped,
    isPremium: mapped.isPremium ?? existing?.isPremium ?? false,
  };
  await db
    .insert(subscriptionStatus)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: subscriptionStatus.userId, set: values });

  return json({ ok: true });
});

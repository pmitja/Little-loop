import { families, familyMembers, subscriptionStatus, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { refreshRevenueCatEntitlement } from './revenuecat-api';

export interface Entitlement {
  isPremium: boolean;
  productId: string | null;
  currentPeriodEnd: string | null;
}

/**
 * Server-side entitlement read (the backstop the client can't spoof).
 * Honors `currentPeriodEnd` grace: premium until the period actually ends,
 * even if the last webhook event was a cancellation.
 */
export async function getEntitlement(db: Db, userId: string): Promise<Entitlement> {
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    columns: { familyId: true },
  });
  const family = membership
    ? await db.query.families.findFirst({
        where: eq(families.id, membership.familyId),
        columns: { ownerUserId: true },
      })
    : null;
  const billingUserId = family?.ownerUserId ?? userId;
  let row = await db.query.subscriptionStatus.findFirst({
    where: eq(subscriptionStatus.userId, billingUserId),
  });
  const now = Date.now();
  const stale =
    !row?.lastEventAt || now - row.lastEventAt.getTime() > 5 * 60 * 1_000;
  const inPeriod = row?.currentPeriodEnd
    ? row.currentPeriodEnd.getTime() > now
    : false;

  // Webhooks remain the primary source. This read-through closes the gap for
  // purchases made before the webhook was configured, delayed events, and
  // renewals whose event was missed.
  if (!row || ((!row.isPremium || !inPeriod) && stale)) {
    const refreshed = await refreshRevenueCatEntitlement(db, billingUserId);
    if (refreshed) {
      row = await db.query.subscriptionStatus.findFirst({
        where: eq(subscriptionStatus.userId, billingUserId),
      });
    }
  }
  if (!row) return { isPremium: false, productId: null, currentPeriodEnd: null };
  const currentlyInPeriod = row.currentPeriodEnd
    ? row.currentPeriodEnd.getTime() > Date.now()
    : false;
  return {
    // A dated subscription expires with its period even if an EXPIRATION
    // webhook is delayed. Non-expiring promotional entitlements use the flag.
    isPremium: row.currentPeriodEnd ? currentlyInPeriod : row.isPremium,
    productId: row.productId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
  };
}

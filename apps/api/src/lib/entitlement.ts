import { families, familyMembers, subscriptionStatus, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';

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
  const row = await db.query.subscriptionStatus.findFirst({
    where: eq(subscriptionStatus.userId, billingUserId),
  });
  if (!row) return { isPremium: false, productId: null, currentPeriodEnd: null };
  const inPeriod = row.currentPeriodEnd ? row.currentPeriodEnd.getTime() > Date.now() : false;
  return {
    isPremium: row.isPremium || inPeriod,
    productId: row.productId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
  };
}

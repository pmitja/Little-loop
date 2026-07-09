import { subscriptionStatus, type Db } from '@littleloop/db';
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
  const row = await db.query.subscriptionStatus.findFirst({
    where: eq(subscriptionStatus.userId, userId),
  });
  if (!row) return { isPremium: false, productId: null, currentPeriodEnd: null };
  const inPeriod = row.currentPeriodEnd ? row.currentPeriodEnd.getTime() > Date.now() : false;
  return {
    isPremium: row.isPremium || inPeriod,
    productId: row.productId,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
  };
}

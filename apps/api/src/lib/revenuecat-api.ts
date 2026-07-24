import { subscriptionStatus, users, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';

const ENTITLEMENT_ID = 'premium';

interface RevenueCatEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
}

interface RevenueCatSubscription {
  store?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, RevenueCatSubscription>;
  };
}

export interface RevenueCatEntitlementSnapshot {
  isPremium: boolean;
  productId: string | null;
  store: 'app_store' | 'play_store' | 'promo' | null;
  currentPeriodEnd: Date | null;
}

function apiKey(): string | null {
  return (
    process.env.REVENUECAT_API_KEY ??
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ??
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ??
    null
  );
}

function mapStore(store?: string | null): RevenueCatEntitlementSnapshot['store'] {
  switch (store?.toLowerCase()) {
    case 'app_store':
    case 'mac_app_store':
      return 'app_store';
    case 'play_store':
      return 'play_store';
    case 'promotional':
      return 'promo';
    default:
      return null;
  }
}

export function parseRevenueCatEntitlement(
  body: RevenueCatSubscriberResponse,
  now = new Date(),
): RevenueCatEntitlementSnapshot {
  const entitlement = body.subscriber?.entitlements?.[ENTITLEMENT_ID];
  const productId = entitlement?.product_identifier ?? null;
  const currentPeriodEnd = entitlement?.expires_date
    ? new Date(entitlement.expires_date)
    : null;
  const hasValidDate = currentPeriodEnd ? !Number.isNaN(currentPeriodEnd.getTime()) : false;
  const normalizedEnd = hasValidDate ? currentPeriodEnd : null;
  const isPremium = Boolean(entitlement) && (!normalizedEnd || normalizedEnd > now);
  const subscription = productId ? body.subscriber?.subscriptions?.[productId] : undefined;

  return {
    isPremium,
    productId,
    store: mapStore(subscription?.store),
    currentPeriodEnd: normalizedEnd,
  };
}

/**
 * Server-side fallback for a missed or not-yet-configured webhook.
 * RevenueCat's subscriber endpoint accepts the app-specific public SDK key;
 * keeping the request on the server prevents arbitrary customer-id lookups.
 */
export async function refreshRevenueCatEntitlement(
  db: Db,
  userId: string,
): Promise<RevenueCatEntitlementSnapshot | null> {
  const key = apiKey();
  if (!key) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { authUserId: true, revenuecatAppUserId: true },
  });
  const appUserId = user?.revenuecatAppUserId ?? user?.authUserId;
  if (!appUserId) return null;

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(4_000),
      },
    );
    if (!response.ok) return null;

    const snapshot = parseRevenueCatEntitlement(
      (await response.json()) as RevenueCatSubscriberResponse,
    );
    await db
      .insert(subscriptionStatus)
      .values({
        userId,
        ...snapshot,
        lastEventType: 'REST_SYNC',
        lastEventAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptionStatus.userId,
        set: {
          ...snapshot,
          lastEventType: 'REST_SYNC',
          lastEventAt: new Date(),
          updatedAt: new Date(),
        },
      });
    return snapshot;
  } catch {
    // RevenueCat being temporarily unavailable must not turn all API reads
    // into 500s. The last webhook/database state remains the safe fallback.
    return null;
  }
}

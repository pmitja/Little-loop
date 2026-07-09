/** RevenueCat webhook event → subscription_status row values (PLAN §12). */

export const RC_EVENT_TYPES = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'TRANSFER',
] as const;

export interface RcEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
}

const PREMIUM_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);
const ENDED_EVENTS = new Set(['EXPIRATION']);

export function mapStore(store?: string): 'app_store' | 'play_store' | 'promo' | null {
  switch (store?.toUpperCase()) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'app_store';
    case 'PLAY_STORE':
      return 'play_store';
    case 'PROMOTIONAL':
      return 'promo';
    default:
      return null;
  }
}

/**
 * Derive is_premium from the event. CANCELLATION and BILLING_ISSUE keep
 * premium until the period actually ends (grace) — getEntitlement() also
 * honors current_period_end, so this flag is the coarse signal.
 */
export function mapEvent(event: RcEvent) {
  let isPremium: boolean | undefined;
  if (PREMIUM_EVENTS.has(event.type)) isPremium = true;
  else if (ENDED_EVENTS.has(event.type)) isPremium = false;
  // CANCELLATION / BILLING_ISSUE / TRANSFER: leave is_premium as-is.

  return {
    isPremium,
    productId: event.product_id ?? null,
    store: mapStore(event.store),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    lastEventType: event.type,
    lastEventAt: event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : new Date(),
  };
}

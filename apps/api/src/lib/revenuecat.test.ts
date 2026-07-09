import { describe, expect, it } from 'vitest';
import { mapEvent, mapStore } from './revenuecat';

describe('mapStore', () => {
  it('maps RevenueCat store names', () => {
    expect(mapStore('APP_STORE')).toBe('app_store');
    expect(mapStore('PLAY_STORE')).toBe('play_store');
    expect(mapStore('PROMOTIONAL')).toBe('promo');
    expect(mapStore('STRIPE')).toBeNull();
    expect(mapStore(undefined)).toBeNull();
  });
});

describe('mapEvent', () => {
  const base = {
    app_user_id: 'user_123',
    product_id: 'll_premium_yearly',
    store: 'APP_STORE',
    expiration_at_ms: Date.now() + 86_400_000,
    event_timestamp_ms: Date.now(),
  };

  it('grants premium on purchase/renewal', () => {
    expect(mapEvent({ ...base, type: 'INITIAL_PURCHASE' }).isPremium).toBe(true);
    expect(mapEvent({ ...base, type: 'RENEWAL' }).isPremium).toBe(true);
    expect(mapEvent({ ...base, type: 'UNCANCELLATION' }).isPremium).toBe(true);
  });

  it('revokes only on expiration', () => {
    expect(mapEvent({ ...base, type: 'EXPIRATION' }).isPremium).toBe(false);
    // Cancellation keeps premium until the period ends (grace).
    expect(mapEvent({ ...base, type: 'CANCELLATION' }).isPremium).toBeUndefined();
    expect(mapEvent({ ...base, type: 'BILLING_ISSUE' }).isPremium).toBeUndefined();
  });

  it('carries period end and event metadata', () => {
    const mapped = mapEvent({ ...base, type: 'RENEWAL' });
    expect(mapped.currentPeriodEnd?.getTime()).toBe(base.expiration_at_ms);
    expect(mapped.productId).toBe('ll_premium_yearly');
    expect(mapped.store).toBe('app_store');
    expect(mapped.lastEventType).toBe('RENEWAL');
  });
});

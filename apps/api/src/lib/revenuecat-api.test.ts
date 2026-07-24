import { describe, expect, it } from 'vitest';
import { parseRevenueCatEntitlement } from './revenuecat-api';

describe('parseRevenueCatEntitlement', () => {
  const now = new Date('2026-07-23T10:00:00Z');

  it('maps an active App Store premium entitlement', () => {
    expect(
      parseRevenueCatEntitlement(
        {
          subscriber: {
            entitlements: {
              premium: {
                product_identifier: 'll_premium_monthly',
                expires_date: '2026-07-23T11:24:29Z',
              },
            },
            subscriptions: {
              ll_premium_monthly: { store: 'app_store' },
            },
          },
        },
        now,
      ),
    ).toEqual({
      isPremium: true,
      productId: 'll_premium_monthly',
      store: 'app_store',
      currentPeriodEnd: new Date('2026-07-23T11:24:29Z'),
    });
  });

  it('marks an expired entitlement as inactive', () => {
    expect(
      parseRevenueCatEntitlement(
        {
          subscriber: {
            entitlements: {
              premium: {
                product_identifier: 'll_premium_monthly',
                expires_date: '2026-07-23T09:00:00Z',
              },
            },
          },
        },
        now,
      ).isPremium,
    ).toBe(false);
  });

  it('defaults to free when premium is absent', () => {
    expect(parseRevenueCatEntitlement({ subscriber: {} }, now)).toEqual({
      isPremium: false,
      productId: null,
      store: null,
      currentPeriodEnd: null,
    });
  });
});

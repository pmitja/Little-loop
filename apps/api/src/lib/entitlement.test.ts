import { subscriptionStatus, type Db } from '@littleloop/db';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, seedUser } from '@/test/db';
import { getEntitlement } from './entitlement';

let db: Db;

async function makeUser(authUserId: string): Promise<string> {
  const row = await seedUser(db, authUserId);
  return row.id;
}

beforeAll(async () => {
  db = await createTestDb();
});

describe('getEntitlement', () => {
  it('defaults to free with no subscription row', async () => {
    const userId = await makeUser('clerk_none');
    expect(await getEntitlement(db, userId)).toEqual({
      isPremium: false,
      productId: null,
      currentPeriodEnd: null,
    });
  });

  it('is premium while isPremium is set', async () => {
    const userId = await makeUser('clerk_active');
    await db
      .insert(subscriptionStatus)
      .values({ userId, isPremium: true, productId: 'll_annual' });
    const ent = await getEntitlement(db, userId);
    expect(ent.isPremium).toBe(true);
    expect(ent.productId).toBe('ll_annual');
  });

  it('honors period grace: cancelled but period not yet ended stays premium', async () => {
    const userId = await makeUser('clerk_grace');
    await db.insert(subscriptionStatus).values({
      userId,
      isPremium: false,
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    expect((await getEntitlement(db, userId)).isPremium).toBe(true);
  });

  it('expires: cancelled and period ended is free', async () => {
    const userId = await makeUser('clerk_expired');
    await db.insert(subscriptionStatus).values({
      userId,
      isPremium: false,
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    expect((await getEntitlement(db, userId)).isPremium).toBe(false);
  });
});

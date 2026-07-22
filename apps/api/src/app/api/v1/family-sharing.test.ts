import { childProfiles, subscriptionStatus, users, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb, seedUser } from '@/test/db';
import { ensurePersonalFamily } from '@/lib/family';

const ctx = vi.hoisted(() => ({
  db: null as unknown as Db,
  user: null as unknown as typeof users.$inferSelect,
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: async () => ({
    db: ctx.db,
    user: ctx.user,
    authUserId: ctx.user.authUserId,
    email: ctx.user.email,
  }),
}));

import { PATCH as updateProfile, DELETE as deleteProfile } from './child-profiles/[id]/route';
import { POST as createProfile } from './child-profiles/route';
import { POST as createInvite } from './family/invites/route';
import { POST as acceptInvite } from './family/invites/accept/route';
import { GET as getFamily } from './family/route';

function request(body?: unknown): Request {
  return new Request('http://test.local', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function actAs(authUserId: string): Promise<typeof users.$inferSelect> {
  const existing = await ctx.db.query.users.findFirst({
    where: eq(users.authUserId, authUserId),
  });
  if (existing) {
    ctx.user = existing;
    return existing;
  }
  const user = await seedUser(ctx.db, authUserId);
  ctx.user = user;
  await ensurePersonalFamily(ctx.db, user.id);
  return user;
}

let owner: typeof users.$inferSelect;
let caregiver: typeof users.$inferSelect;
let profileId: string;

beforeAll(async () => {
  ctx.db = await createTestDb();
  owner = await actAs('family_owner');
  await ctx.db.insert(subscriptionStatus).values({ userId: owner.id, isPremium: true });
  const profileResponse = await createProfile(
    request({ nickname: 'Mila', ageRange: '5-7', avatar: 'fox' }),
    {},
  );
  profileId = (await profileResponse.json()).childProfile.id;

  const inviteResponse = await createInvite(request(), {});
  expect(inviteResponse.status).toBe(201);
  const { invite } = await inviteResponse.json();

  caregiver = await actAs('family_caregiver');
  const acceptResponse = await acceptInvite(request({ token: invite.token }), {});
  expect(acceptResponse.status).toBe(200);
});

describe('caregiver permissions', () => {
  it('lets a caregiver edit a shared child profile', async () => {
    await actAs(caregiver.authUserId);
    const response = await updateProfile(
      request({ dailyLimitMinutes: 60, bedtime: '8:00 PM' }),
      { params: Promise.resolve({ id: profileId }) },
    );
    expect(response.status).toBe(200);
    const saved = await ctx.db.query.childProfiles.findFirst({
      where: eq(childProfiles.id, profileId),
    });
    expect(saved?.dailyLimitMinutes).toBe(60);
    expect(saved?.bedtime).toBe('8:00 PM');
  });

  it('inherits Premium from the main caregiver', async () => {
    await actAs(caregiver.authUserId);
    const response = await createProfile(
      request({ nickname: 'Ben', ageRange: '2-4', avatar: 'bear' }),
      {},
    );
    expect(response.status).toBe(201);
  });

  it('does not let a caregiver delete a child profile', async () => {
    await actAs(caregiver.authUserId);
    const response = await deleteProfile(request(), {
      params: Promise.resolve({ id: profileId }),
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('OWNER_REQUIRED');
  });

  it('does not let a caregiver invite other caregivers', async () => {
    await actAs(caregiver.authUserId);
    const response = await createInvite(request(), {});
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('OWNER_REQUIRED');
  });
});

describe('family bootstrap', () => {
  it('self-heals an authenticated user whose family row is missing', async () => {
    ctx.user = await seedUser(ctx.db, 'family_orphan');

    const response = await getFamily(request(), {});
    expect(response.status).toBe(200);
    const { family } = await response.json();
    expect(family.role).toBe('owner');
    expect(family.members).toHaveLength(1);
  });
});

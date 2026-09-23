import {
  childDevices,
  childProfiles,
  playlists,
  playlistVideos,
  subscriptionStatus,
  users,
  videoMetadata,
  watchSessions,
  type Db,
} from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestDb, seedUser } from '@/test/db';
import { ensurePersonalFamily } from '@/lib/family';

const ctx = vi.hoisted(() => ({
  db: null as unknown as Db,
  user: null as unknown as typeof users.$inferSelect,
}));

// Parent routes: swap in the test user. Kid routes: they never use requireAuth,
// only the real bearer-token check against the test DB via getDb().
vi.mock('@/lib/auth', () => ({
  requireAuth: async () => ({
    db: ctx.db,
    user: ctx.user,
    authUserId: ctx.user.authUserId,
    email: ctx.user.email,
  }),
}));
vi.mock('@littleloop/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@littleloop/db')>()),
  getDb: () => ctx.db,
}));

import { POST as startPairing } from './kid/pairing-sessions/route';
import { GET as pollPairing } from './kid/pairing-sessions/[id]/route';
import { GET as kidState } from './kid/state/route';
import { POST as kidFinishSession } from './kid/watch-sessions/route';
import { POST as kidRaiseRequest } from './kid/requests/route';
import { GET as listDevices, POST as claimDevice } from './child-devices/route';
import { DELETE as unpairDevice, PATCH as patchDevice } from './child-devices/[id]/route';
import { GET as listRequests } from './requests/route';

function req(method: string, body?: unknown, token?: string, query = ''): Request {
  return new Request(`http://test.local/?${query}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function finishedSession(overrides: { totalSeconds: number }) {
  const endedAt = new Date();
  return {
    clientSessionId: crypto.randomUUID(),
    startedAt: new Date(endedAt.getTime() - 120_000).toISOString(),
    endedAt: endedAt.toISOString(),
    endReason: 'app_closed',
    ...overrides,
  };
}

let installCounter = 0;
async function openPairing(installId = `install-${installCounter++}`) {
  const request = req('POST', { installId, platform: 'ios' });
  // One address per pairing so the per-IP pairing rate limit never trips here.
  request.headers.set('x-forwarded-for', `10.0.0.${installCounter++}`);
  const res = await startPairing(request, {});
  expect(res.status).toBe(201);
  const { pairing } = await res.json();
  return pairing as { id: string; code: string; secret: string };
}

async function actAs(authUserId: string) {
  ctx.user = await seedUser(ctx.db, authUserId);
  return ensurePersonalFamily(ctx.db, ctx.user.id);
}

async function seedChild(familyId: string, nickname: string) {
  const [child] = await ctx.db
    .insert(childProfiles)
    .values({ familyId, nickname, ageRange: '5-7' })
    .returning();
  const [playlist] = await ctx.db.insert(playlists).values({ childProfileId: child.id }).returning();
  return { child, playlist };
}

/** Pair a fresh kid device to `childProfileId`; returns its device token. */
async function pair(childProfileId: string, installId?: string) {
  const pairing = await openPairing(installId);
  const res = await claimDevice(req('POST', { code: pairing.code, childProfileId }), {});
  return { res, token: pairing.secret, pairing };
}

beforeAll(async () => {
  ctx.db = await createTestDb();
});

describe('pairing flow', () => {
  it('pairs a kid device to one child and serves only that child', async () => {
    const family = await actAs('kid_pair_owner');
    const { child, playlist } = await seedChild(family.familyId, 'Mila');
    const [video] = await ctx.db
      .insert(videoMetadata)
      .values({
        providerVideoId: 'kidvid00001',
        title: 'Counting song',
        channelTitle: 'Test Channel',
        durationSeconds: 120,
        thumbnailUrl: 'https://i.ytimg.com/test.jpg',
      })
      .returning();
    await ctx.db.insert(playlistVideos).values({
      playlistId: playlist.id,
      videoMetadataId: video.id,
      position: 0,
      approvedByUserId: ctx.user.id,
    });

    const pairing = await openPairing();
    expect(pairing.code).toMatch(/^\d{6}$/);

    const pending = await pollPairing(req('GET', undefined, pairing.secret), params(pairing.id));
    expect((await pending.json()).status).toBe('pending');

    const claimed = await claimDevice(
      req('POST', { code: pairing.code, childProfileId: child.id }),
      {},
    );
    expect(claimed.status).toBe(201);

    const paired = await pollPairing(req('GET', undefined, pairing.secret), params(pairing.id));
    const pairedBody = await paired.json();
    expect(pairedBody.status).toBe('paired');
    expect(pairedBody.device.childProfileId).toBe(child.id);

    // The pairing secret is now the device token.
    const state = await kidState(req('GET', undefined, pairing.secret), {});
    expect(state.status).toBe(200);
    const body = await state.json();
    expect(body.childProfile.id).toBe(child.id);
    expect(body.playlist.videos.map((v: { video: { providerVideoId: string } }) => v.video.providerVideoId))
      .toEqual(['kidvid00001']);
    expect(body.secondsWatchedToday).toBe(0);

    const list = await listDevices(req('GET'), {});
    expect((await list.json()).devices).toHaveLength(1);
  });

  it('rejects a wrong code, and a code can only be claimed once', async () => {
    const family = await actAs('kid_pair_codes');
    const { child } = await seedChild(family.familyId, 'Ben');
    const pairing = await openPairing();
    const wrong = pairing.code === '000000' ? '111111' : '000000';

    const bad = await claimDevice(req('POST', { code: wrong, childProfileId: child.id }), {});
    expect(bad.status).toBe(404);

    const ok = await claimDevice(req('POST', { code: pairing.code, childProfileId: child.id }), {});
    expect(ok.status).toBe(201);
    const again = await claimDevice(
      req('POST', { code: pairing.code, childProfileId: child.id }),
      {},
    );
    expect(again.status).toBe(404);
  });

  it('never lets someone poll a pairing without its secret', async () => {
    const pairing = await openPairing();
    const res = await pollPairing(req('GET', undefined, 'not-the-secret'), params(pairing.id));
    expect(res.status).toBe(404);
  });

  it('cannot claim a code for another family’s child', async () => {
    const other = await actAs('kid_pair_other_family');
    const { child: foreignChild } = await seedChild(other.familyId, 'Zoe');
    await actAs('kid_pair_intruder');
    const pairing = await openPairing();
    const res = await claimDevice(
      req('POST', { code: pairing.code, childProfileId: foreignChild.id }),
      {},
    );
    expect(res.status).toBe(404);
  });

  it('re-pairing the same install replaces its old entry', async () => {
    const family = await actAs('kid_pair_reinstall');
    const { child } = await seedChild(family.familyId, 'Ava');
    const first = await pair(child.id, 'same-install');
    expect(first.res.status).toBe(201);
    const second = await pair(child.id, 'same-install');
    expect(second.res.status).toBe(201);

    expect((await kidState(req('GET', undefined, first.token), {})).status).toBe(401);
    expect((await kidState(req('GET', undefined, second.token), {})).status).toBe(200);
    expect((await (await listDevices(req('GET'), {})).json()).devices).toHaveLength(1);
  });
});

describe('kid device access', () => {
  it('401s without a token or with a bad one', async () => {
    expect((await kidState(req('GET'), {})).status).toBe(401);
    expect((await kidState(req('GET', undefined, 'garbage'), {})).status).toBe(401);
  });

  it('unpairing revokes the token immediately', async () => {
    const family = await actAs('kid_unpair');
    const { child } = await seedChild(family.familyId, 'Leo');
    const { res, token } = await pair(child.id);
    const { device } = await res.json();

    expect((await kidState(req('GET', undefined, token), {})).status).toBe(200);
    expect((await unpairDevice(req('DELETE'), params(device.id))).status).toBe(200);
    const after = await kidState(req('GET', undefined, token), {});
    expect(after.status).toBe(401);
    expect((await after.json()).error.code).toBe('DEVICE_REVOKED');
  });

  it('deleting the child profile revokes its devices', async () => {
    const family = await actAs('kid_deleted_child');
    const { child } = await seedChild(family.familyId, 'Ivy');
    const { token } = await pair(child.id);
    await ctx.db
      .update(childProfiles)
      .set({ deletedAt: new Date() })
      .where(eq(childProfiles.id, child.id));
    expect((await kidState(req('GET', undefined, token), {})).status).toBe(401);
  });

  it('records a finished session in one write and counts it in today’s total', async () => {
    const family = await actAs('kid_watch');
    const { child } = await seedChild(family.familyId, 'Max');
    const { token } = await pair(child.id);

    const session = finishedSession({ totalSeconds: 60 });
    expect((await kidFinishSession(req('POST', session, token), {})).status).toBe(200);
    const state = await (await kidState(req('GET', undefined, token), {})).json();
    expect(state.secondsWatchedToday).toBe(60);
  });

  it('caps reported time at wall-clock time', async () => {
    const family = await actAs('kid_watch_cap');
    const { child } = await seedChild(family.familyId, 'Cap');
    const { token } = await pair(child.id);

    // 2 minutes of wall clock can't hold an hour of watching.
    await kidFinishSession(req('POST', finishedSession({ totalSeconds: 3600 }), token), {});
    const state = await (await kidState(req('GET', undefined, token), {})).json();
    expect(state.secondsWatchedToday).toBeLessThanOrEqual(132);
  });

  it('ignores a re-sent session', async () => {
    const family = await actAs('kid_resend');
    const { child } = await seedChild(family.familyId, 'Remy');
    const { token } = await pair(child.id);

    const session = finishedSession({ totalSeconds: 30 });
    await kidFinishSession(req('POST', session, token), {});
    await kidFinishSession(req('POST', { ...session, totalSeconds: 90 }, token), {});
    const rows = await ctx.db.query.watchSessions.findMany({
      where: eq(watchSessions.clientSessionId, session.clientSessionId),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].totalSeconds).toBe(30);
  });

  it('raises want-more requests into the shared parent queue', async () => {
    const family = await actAs('kid_requests');
    const { child } = await seedChild(family.familyId, 'Noa');
    const { token } = await pair(child.id);

    const raised = await kidRaiseRequest(req('POST', { kind: 'more' }, token), {});
    expect(raised.status).toBe(201);
    const parentView = await listRequests(req('GET', undefined, undefined, `childProfileId=${child.id}`), {});
    expect((await parentView.json()).requests).toHaveLength(1);
  });
});

describe('free plan: kid devices for one child', () => {
  it('allows several devices for one child, blocks a second child, allows it with Premium', async () => {
    const family = await actAs('kid_free_plan');
    const { child: first } = await seedChild(family.familyId, 'First');
    const { child: second } = await seedChild(family.familyId, 'Second');

    expect((await pair(first.id)).res.status).toBe(201);
    expect((await pair(first.id)).res.status).toBe(201);

    const blocked = await pair(second.id);
    expect(blocked.res.status).toBe(402);
    expect((await blocked.res.json()).error.code).toBe('PREMIUM_REQUIRED');

    await ctx.db.insert(subscriptionStatus).values({ userId: ctx.user.id, isPremium: true });
    const premium = await pair(second.id);
    expect(premium.res.status).toBe(201);

    // Downgrade: the first child's devices keep working, the second child's stop.
    await ctx.db.delete(subscriptionStatus).where(eq(subscriptionStatus.userId, ctx.user.id));
    const secondState = await kidState(req('GET', undefined, premium.token), {});
    expect(secondState.status).toBe(402);
    const firstDevice = await ctx.db.query.childDevices.findFirst({
      where: eq(childDevices.childProfileId, first.id),
    });
    expect(firstDevice?.revokedAt).toBeNull();
  });

  it('moving the only device to another child is allowed on free', async () => {
    const family = await actAs('kid_free_move');
    const { child: a } = await seedChild(family.familyId, 'A');
    const { child: b } = await seedChild(family.familyId, 'B');
    const { res, token } = await pair(a.id);
    const { device } = await res.json();

    const moved = await patchDevice(req('PATCH', { childProfileId: b.id }), params(device.id));
    expect(moved.status).toBe(200);
    const state = await kidState(req('GET', undefined, token), {});
    expect((await state.json()).childProfile.id).toBe(b.id);
  });
});

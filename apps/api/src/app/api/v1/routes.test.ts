import {
  childProfiles,
  playlists,
  subscriptionStatus,
  users,
  videoMetadata,
  type Db,
} from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FREE_LIMITS } from '@littleloop/shared';
import { createTestDb } from '@/test/db';
import { ensurePersonalFamily } from '@/lib/family';

// Route handlers pull auth from @/lib/auth — swap in the test DB + user so the
// free-limit / ownership logic runs against real Postgres (PGlite) unmocked.
const ctx = vi.hoisted(() => ({
  db: null as unknown as Db,
  user: null as unknown as typeof users.$inferSelect,
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: async () => ({ db: ctx.db, user: ctx.user, clerkId: ctx.user.clerkId }),
  deleteClerkUser: vi.fn(async () => {}),
}));

import { POST as createProfile } from './child-profiles/route';
import { POST as addVideo } from './playlists/[id]/videos/route';
import { POST as approveChannel } from './channels/route';
import { GET as listRequests, POST as createRequest } from './requests/route';
import { DELETE as resolveRequest } from './requests/[id]/route';
import { DELETE as deleteAccount } from './users/route';

function post(body: unknown): Request {
  return new Request('http://test.local', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function get(query = ''): Request {
  return new Request(`http://test.local/?${query}`);
}

async function actAs(clerkId: string): Promise<void> {
  const [row] = await ctx.db
    .insert(users)
    .values({ clerkId, email: `${clerkId}@example.com` })
    .returning();
  ctx.user = row;
  await ensurePersonalFamily(ctx.db, row.id);
}

/** Seed a fresh cached video_metadata row so the route never calls YouTube. */
let videoCounter = 0;
async function seedVideo(): Promise<string> {
  const providerVideoId = `vid${String(videoCounter++).padStart(8, '0')}`;
  await ctx.db.insert(videoMetadata).values({
    providerVideoId,
    title: `Video ${providerVideoId}`,
    channelTitle: 'Test Channel',
    durationSeconds: 120,
    thumbnailUrl: 'https://i.ytimg.com/test.jpg',
  });
  return providerVideoId;
}

const profileBody = { nickname: 'Mila', ageRange: '5-7', avatar: 'fox' };

beforeAll(async () => {
  ctx.db = await createTestDb();
});

describe('POST /child-profiles free limit', () => {
  it('allows the first profile and auto-creates its playlist', async () => {
    await actAs('clerk_free');
    const res = await createProfile(post(profileBody), {});
    expect(res.status).toBe(201);
    const { childProfile } = await res.json();
    const playlist = await ctx.db.query.playlists.findFirst({
      where: eq(playlists.childProfileId, childProfile.id),
    });
    expect(playlist).toBeDefined();
  });

  it('402s on the second profile for free users', async () => {
    const res = await createProfile(post({ ...profileBody, nickname: 'Ben' }), {});
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe('LIMIT_REACHED');
  });

  it('allows the second profile for premium users', async () => {
    await ctx.db.insert(subscriptionStatus).values({ userId: ctx.user.id, isPremium: true });
    const res = await createProfile(post({ ...profileBody, nickname: 'Ben' }), {});
    expect(res.status).toBe(201);
  });
});

describe('POST /channels premium gate', () => {
  it('402s for free users before touching YouTube', async () => {
    await actAs('clerk_channels_free');
    const created = await createProfile(post(profileBody), {});
    const { childProfile } = await created.json();
    const res = await approveChannel(post({ childProfileId: childProfile.id, providerVideoId: 'vid99999999' }), {});
    expect(res.status).toBe(402);
    expect((await res.json()).error.code).toBe('PREMIUM_REQUIRED');
  });
});

describe('POST /playlists/:id/videos free limit + duplicates', () => {
  let playlistId: string;

  beforeAll(async () => {
    await actAs('clerk_videos');
    const res = await createProfile(post(profileBody), {});
    const { childProfile } = await res.json();
    const playlist = await ctx.db.query.playlists.findFirst({
      where: eq(playlists.childProfileId, childProfile.id),
    });
    playlistId = playlist!.id;
  });

  const routeCtx = () => ({ params: Promise.resolve({ id: playlistId }) });

  it(`accepts up to ${FREE_LIMITS.videosPerPlaylist} videos with sequential positions`, async () => {
    for (let i = 0; i < FREE_LIMITS.videosPerPlaylist; i++) {
      const providerVideoId = await seedVideo();
      const res = await addVideo(post({ providerVideoId }), routeCtx());
      expect(res.status).toBe(201);
      const { playlistVideo } = await res.json();
      expect(playlistVideo.position).toBe(i);
    }
  });

  it('409s on a duplicate video', async () => {
    // The duplicate check runs before the free limit, so re-adding an
    // already-approved id must 409 even with the playlist at capacity.
    const existing = await ctx.db.query.playlistVideos.findMany({ with: { video: true } });
    const dupId = existing[0].video.providerVideoId;
    const res = await addVideo(post({ providerVideoId: dupId }), routeCtx());
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('DUPLICATE_VIDEO');
  });

  it(`402s on video ${FREE_LIMITS.videosPerPlaylist + 1} for free users`, async () => {
    const providerVideoId = await seedVideo();
    const res = await addVideo(post({ providerVideoId }), routeCtx());
    expect(res.status).toBe(402);
    expect((await res.json()).error.code).toBe('LIMIT_REACHED');
  });

  it(`allows video ${FREE_LIMITS.videosPerPlaylist + 1} for premium users`, async () => {
    await ctx.db.insert(subscriptionStatus).values({ userId: ctx.user.id, isPremium: true });
    const providerVideoId = await seedVideo();
    const res = await addVideo(post({ providerVideoId }), routeCtx());
    expect(res.status).toBe(201);
  });

  it("404s when adding to another user's playlist", async () => {
    await actAs('clerk_intruder');
    const providerVideoId = await seedVideo();
    const res = await addVideo(post({ providerVideoId }), routeCtx());
    expect(res.status).toBe(404);
  });
});

describe('/requests shared want-more queue', () => {
  let childProfileId: string;

  beforeAll(async () => {
    await actAs('clerk_requests');
    const res = await createProfile(post(profileBody), {});
    childProfileId = (await res.json()).childProfile.id;
  });

  it('creates a pending channel request', async () => {
    const res = await createRequest(
      post({ childProfileId, kind: 'channel', channelTitle: 'Blippi', sampleVideoId: 'vidabc' }),
      {},
    );
    expect(res.status).toBe(201);
    expect((await res.json()).request.status).toBe('pending');
  });

  it('coalesces a repeat ask for the same channel (no duplicate row)', async () => {
    const res = await createRequest(
      post({ childProfileId, kind: 'channel', channelTitle: 'Blippi', sampleVideoId: 'vidxyz' }),
      {},
    );
    expect(res.status).toBe(200);
    const listed = await listRequests(get(`childProfileId=${childProfileId}`));
    const blippi = (await listed.json()).requests.filter(
      (r: { channelTitle?: string }) => r.channelTitle === 'Blippi',
    );
    expect(blippi).toHaveLength(1);
  });

  it('lists pending requests for the child', async () => {
    const res = await listRequests(get(`childProfileId=${childProfileId}`));
    expect(res.status).toBe(200);
    expect((await res.json()).requests.length).toBeGreaterThan(0);
  });

  it('resolves a request so it drops off the queue', async () => {
    const created = await createRequest(post({ childProfileId, kind: 'more' }), {});
    const { request } = await created.json();
    const res = await resolveRequest(new Request('http://test.local', { method: 'DELETE' }), {
      params: Promise.resolve({ id: request.id }),
    });
    expect(res.status).toBe(200);
    const listed = await listRequests(get(`childProfileId=${childProfileId}`));
    const more = (await listed.json()).requests.filter(
      (r: { kind: string }) => r.kind === 'more',
    );
    expect(more).toHaveLength(0);
  });

  it("404s listing another family's child", async () => {
    await actAs('clerk_requests_intruder');
    const res = await listRequests(get(`childProfileId=${childProfileId}`));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /users account deletion', () => {
  it('cascades the whole account and deletes the Clerk user', async () => {
    await actAs('clerk_gone');
    await createProfile(post(profileBody), {});
    const userId = ctx.user.id;
    const familyId = (await ensurePersonalFamily(ctx.db, userId)).familyId;

    const res = await deleteAccount(new Request('http://test.local', { method: 'DELETE' }), {});
    expect(res.status).toBe(200);

    const [{ deleteClerkUser }, remainingUser, remainingProfiles] = await Promise.all([
      import('@/lib/auth'),
      ctx.db.query.users.findFirst({ where: eq(users.id, userId) }),
      ctx.db.query.childProfiles.findMany({ where: eq(childProfiles.familyId, familyId) }),
    ]);
    expect(deleteClerkUser).toHaveBeenCalledWith('clerk_gone');
    expect(remainingUser).toBeUndefined();
    expect(remainingProfiles).toHaveLength(0);
  });
});

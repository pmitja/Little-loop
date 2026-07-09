import { childProfiles, playlists, users, type Db } from '@littleloop/db';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { HttpError } from './http';
import { requireChildProfile, requirePlaylist } from './ownership';

let db: Db;
let owner: { id: string };
let stranger: { id: string };
let profileId: string;
let playlistId: string;

beforeAll(async () => {
  db = await createTestDb();
  [owner] = await db
    .insert(users)
    .values({ clerkId: 'clerk_owner', email: 'owner@example.com' })
    .returning();
  [stranger] = await db
    .insert(users)
    .values({ clerkId: 'clerk_stranger', email: 'stranger@example.com' })
    .returning();
  const [profile] = await db
    .insert(childProfiles)
    .values({ userId: owner.id, nickname: 'Mila', ageRange: '5-7' })
    .returning();
  profileId = profile.id;
  const [playlist] = await db.insert(playlists).values({ childProfileId: profileId }).returning();
  playlistId = playlist.id;
});

describe('requireChildProfile', () => {
  it('returns the row for the owner', async () => {
    const row = await requireChildProfile(db, owner.id, profileId);
    expect(row.nickname).toBe('Mila');
  });

  it("404s (not 403) on another user's profile", async () => {
    const err = await requireChildProfile(db, stranger.id, profileId).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
  });

  it('404s on a soft-deleted profile', async () => {
    const [deleted] = await db
      .insert(childProfiles)
      .values({ userId: owner.id, nickname: 'Old', ageRange: '2-4', deletedAt: new Date() })
      .returning();
    await expect(requireChildProfile(db, owner.id, deleted.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('requirePlaylist', () => {
  it('returns the row for the owner', async () => {
    const row = await requirePlaylist(db, owner.id, playlistId);
    expect(row.id).toBe(playlistId);
  });

  it("404s on another user's playlist", async () => {
    await expect(requirePlaylist(db, stranger.id, playlistId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

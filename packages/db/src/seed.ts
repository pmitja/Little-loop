/**
 * Dev seed: one user + child profile + playlist with two known-good,
 * embeddable kids videos. Run with DATABASE_URL set:
 *   pnpm --filter @littleloop/db seed
 */
import { getDb } from './index';
import {
  authUser,
  childProfiles,
  families,
  familyMembers,
  playlists,
  playlistVideos,
  users,
  videoMetadata,
} from './schema';

const SEED_AUTH_USER_ID = 'seed_auth_user';

async function seed() {
  const db = getDb();

  // The dev seed has no real better-auth identity, so stand one up directly to
  // satisfy the users.authUserId FK.
  await db
    .insert(authUser)
    .values({ id: SEED_AUTH_USER_ID, email: 'seed@littleloop.dev' })
    .onConflictDoNothing();

  const [user] = await db
    .insert(users)
    .values({ authUserId: SEED_AUTH_USER_ID, email: 'seed@littleloop.dev' })
    .onConflictDoUpdate({ target: users.authUserId, set: { email: 'seed@littleloop.dev' } })
    .returning();

  const [family] = await db
    .insert(families)
    .values({ ownerUserId: user.id })
    .onConflictDoUpdate({ target: families.ownerUserId, set: { updatedAt: new Date() } })
    .returning();
  await db
    .insert(familyMembers)
    .values({ familyId: family.id, userId: user.id, role: 'owner' })
    .onConflictDoNothing({ target: familyMembers.userId });

  const [child] = await db
    .insert(childProfiles)
    .values({ familyId: family.id, nickname: 'Emma', ageRange: '5-7', avatar: 'bear', dailyLimitMinutes: 45 })
    .returning();

  const [playlist] = await db
    .insert(playlists)
    .values({ childProfileId: child.id, name: 'My playlist' })
    .returning();

  const seedVideos = [
    {
      providerVideoId: 'XqZsoesa55w', // Baby Shark Dance — Pinkfong
      title: 'Baby Shark Dance',
      channelTitle: 'Pinkfong Baby Shark - Kids\' Songs & Stories',
      durationSeconds: 136,
    },
    {
      providerVideoId: 'yCjJyiqpAuU', // Twinkle Twinkle Little Star — Super Simple Songs
      title: 'Twinkle Twinkle Little Star',
      channelTitle: 'Super Simple Songs - Kids Songs',
      durationSeconds: 202,
    },
  ];

  for (const [i, v] of seedVideos.entries()) {
    const [meta] = await db
      .insert(videoMetadata)
      .values({
        provider: 'youtube',
        providerVideoId: v.providerVideoId,
        title: v.title,
        channelTitle: v.channelTitle,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: `https://i.ytimg.com/vi/${v.providerVideoId}/hqdefault.jpg`,
      })
      .onConflictDoUpdate({
        target: [videoMetadata.provider, videoMetadata.providerVideoId],
        set: { title: v.title },
      })
      .returning();

    await db
      .insert(playlistVideos)
      .values({
        playlistId: playlist.id,
        videoMetadataId: meta.id,
        position: i,
        approvedByUserId: user.id,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded user ${user.email} → child "${child.nickname}" → ${seedVideos.length} videos`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

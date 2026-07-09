import { createChildProfileSchema, FREE_LIMITS } from '@littleloop/shared';
import { childProfiles, playlists } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { handle, HttpError, json, parseBody } from '@/lib/http';

export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const rows = await db.query.childProfiles.findMany({
    where: and(eq(childProfiles.userId, user!.id), isNull(childProfiles.deletedAt)),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return json({ childProfiles: rows });
});

export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const body = await parseBody(req, createChildProfileSchema);

  const existing = await db.query.childProfiles.findMany({
    where: and(eq(childProfiles.userId, user!.id), isNull(childProfiles.deletedAt)),
    columns: { id: true },
  });
  if (existing.length >= FREE_LIMITS.childProfiles) {
    const { isPremium } = await getEntitlement(db, user!.id);
    if (!isPremium) {
      throw new HttpError(402, 'LIMIT_REACHED', 'Upgrade to add more child profiles');
    }
  }

  const [profile] = await db
    .insert(childProfiles)
    .values({
      userId: user!.id,
      nickname: body.nickname,
      ageRange: body.ageRange,
      avatar: body.avatar,
      dailyLimitMinutes: body.dailyLimitMinutes ?? null,
    })
    .returning();

  // Every child starts with their one playlist — the client never has to
  // create it explicitly in the free tier.
  await db.insert(playlists).values({ childProfileId: profile.id });

  return json({ childProfile: profile }, 201);
});

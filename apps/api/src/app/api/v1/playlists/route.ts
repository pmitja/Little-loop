import { FREE_LIMITS } from '@littleloop/shared';
import { childProfiles, playlists } from '@littleloop/db';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';
import { requireFamilyMembership } from '@/lib/family';

export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyMembership(db, user!.id);
  const childProfileId = new URL(req.url).searchParams.get('childProfileId');
  if (childProfileId) await requireChildProfile(db, user!.id, childProfileId);

  const ownedChildren = await db.query.childProfiles.findMany({
    where: and(eq(childProfiles.familyId, family.familyId), isNull(childProfiles.deletedAt)),
    columns: { id: true },
  });
  const childIds = childProfileId ? [childProfileId] : ownedChildren.map((c) => c.id);
  const rows = childIds.length
    ? await db.query.playlists.findMany({
        where: and(inArray(playlists.childProfileId, childIds), isNull(playlists.deletedAt)),
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      })
    : [];
  return json({ playlists: rows });
});

const createPlaylistSchema = z.object({
  childProfileId: z.string().uuid(),
  name: z.string().trim().min(1).max(60).optional(),
});

export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyMembership(db, user!.id);
  const body = await parseBody(req, createPlaylistSchema);
  await requireChildProfile(db, user!.id, body.childProfileId);

  // Free tier: 1 playlist per account, counted across all children (PLAN §12).
  const ownedChildren = await db.query.childProfiles.findMany({
    where: and(eq(childProfiles.familyId, family.familyId), isNull(childProfiles.deletedAt)),
    columns: { id: true },
  });
  const existing = await db.query.playlists.findMany({
    where: and(
      inArray(playlists.childProfileId, ownedChildren.map((c) => c.id)),
      isNull(playlists.deletedAt),
    ),
    columns: { id: true },
  });
  if (existing.length >= FREE_LIMITS.playlists) {
    const { isPremium } = await getEntitlement(db, user!.id);
    if (!isPremium) {
      throw new HttpError(402, 'LIMIT_REACHED', 'Upgrade to add more playlists');
    }
  }

  const [playlist] = await db
    .insert(playlists)
    .values({ childProfileId: body.childProfileId, name: body.name })
    .returning();
  return json({ playlist }, 201);
});

import { childProfiles, devices, users } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { fetchClerkEmail, requireAuth } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlement';
import { ensurePersonalFamily } from '@/lib/family';
import { handle, json, parseBody } from '@/lib/http';

const syncSchema = z.object({
  installId: z.string().min(1).max(64),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().max(32).optional(),
});

/** Upsert user after Clerk sign-in + register the device (PLAN §8). */
export const POST = handle(async (req) => {
  const ctx = await requireAuth(req, { allowUnsynced: true });
  const body = await parseBody(req, syncSchema);

  let user = ctx.user;
  if (!user) {
    const email = await fetchClerkEmail(ctx.clerkId);
    // logIn(clerkUserId) on the client makes the RevenueCat app-user-id == clerkId (PLAN §12).
    [user] = await ctx.db
      .insert(users)
      .values({ clerkId: ctx.clerkId, email, revenuecatAppUserId: ctx.clerkId })
      .onConflictDoUpdate({ target: users.clerkId, set: { email } })
      .returning();
  }

  const family = await ensurePersonalFamily(ctx.db, user.id);

  await ctx.db
    .insert(devices)
    .values({
      userId: user.id,
      installId: body.installId,
      platform: body.platform,
      appVersion: body.appVersion,
    })
    .onConflictDoUpdate({
      target: [devices.userId, devices.installId],
      set: { appVersion: body.appVersion, lastSeenAt: new Date() },
    });

  const [entitlement, profiles] = await Promise.all([
    getEntitlement(ctx.db, user.id),
    ctx.db.query.childProfiles.findMany({
      where: and(eq(childProfiles.familyId, family.familyId), isNull(childProfiles.deletedAt)),
    }),
  ]);

  return json({
    user: { id: user.id, email: user.email },
    entitlement,
    family: { id: family.familyId, role: family.role },
    childProfiles: profiles,
  });
});

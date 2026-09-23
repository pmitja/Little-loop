import { childDevices, devicePairingSessions } from '@littleloop/db';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { assertKidDeviceAllowed, hashSecret, toChildDeviceDto } from '@/lib/childDevices';
import { requireFamilyMembership } from '@/lib/family';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

/** The family's paired kid devices (Settings → Kid devices). */
export const GET = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyMembership(db, user!.id);
  const rows = await db.query.childDevices.findMany({
    where: and(eq(childDevices.familyId, family.familyId), isNull(childDevices.revokedAt)),
    orderBy: [desc(childDevices.createdAt)],
  });
  return json({ devices: rows.map(toChildDeviceDto) });
});

const claimSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  childProfileId: z.string().uuid(),
  name: z.string().trim().min(1).max(40).optional(),
});

/**
 * Parent device claims the code a kid device is showing, for one child. The
 * kid's pairing secret becomes its device token; it learns this on its next
 * poll. Free plan: kid devices for one child only.
 */
export const POST = handle(async (req) => {
  const { db, user } = await requireAuth(req, { limitPerMinute: 10 });
  const body = await parseBody(req, claimSchema);
  const child = await requireChildProfile(db, user!.id, body.childProfileId);

  const now = new Date();
  const session = await db.query.devicePairingSessions.findFirst({
    where: and(
      eq(devicePairingSessions.codeHash, hashSecret(body.code)),
      isNull(devicePairingSessions.claimedAt),
      gt(devicePairingSessions.expiresAt, now),
    ),
  });
  if (!session) {
    throw new HttpError(404, 'PAIRING_NOT_FOUND', 'That code is wrong or has expired');
  }
  await assertKidDeviceAllowed(db, child.familyId, child.id, { installId: session.installId });

  // Conditional update is the race guard: only one claim can flip claimedAt.
  const [claimed] = await db
    .update(devicePairingSessions)
    .set({ claimedAt: now })
    .where(
      and(eq(devicePairingSessions.id, session.id), isNull(devicePairingSessions.claimedAt)),
    )
    .returning({ id: devicePairingSessions.id });
  if (!claimed) {
    throw new HttpError(404, 'PAIRING_NOT_FOUND', 'That code is wrong or has expired');
  }

  // A reinstalled kid app pairing again replaces its old entry.
  await db
    .update(childDevices)
    .set({ revokedAt: now })
    .where(
      and(
        eq(childDevices.familyId, child.familyId),
        eq(childDevices.installId, session.installId),
        isNull(childDevices.revokedAt),
      ),
    );

  let device: typeof childDevices.$inferSelect;
  try {
    [device] = await db
      .insert(childDevices)
      .values({
        familyId: child.familyId,
        childProfileId: child.id,
        name: body.name ?? session.deviceName,
        platform: session.platform,
        installId: session.installId,
        tokenHash: session.secretHash,
        pairedByUserId: user!.id,
      })
      .returning();
  } catch (error) {
    // No transactions over Neon HTTP: release the claim so the code still works.
    await db
      .update(devicePairingSessions)
      .set({ claimedAt: null })
      .where(eq(devicePairingSessions.id, session.id));
    throw error;
  }
  await db
    .update(devicePairingSessions)
    .set({ childDeviceId: device.id })
    .where(eq(devicePairingSessions.id, session.id));

  return json({ device: toChildDeviceDto(device) }, 201);
});

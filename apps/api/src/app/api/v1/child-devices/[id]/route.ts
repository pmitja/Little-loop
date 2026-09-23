import { childDevices } from '@littleloop/db';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { assertKidDeviceAllowed, toChildDeviceDto } from '@/lib/childDevices';
import { requireFamilyMembership } from '@/lib/family';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { requireChildProfile } from '@/lib/ownership';

type Ctx = { params: Promise<{ id: string }> };

async function requireFamilyDevice(req: Request, id: string) {
  const { db, user } = await requireAuth(req);
  const family = await requireFamilyMembership(db, user!.id);
  const device = await db.query.childDevices.findFirst({
    where: and(
      eq(childDevices.id, id),
      eq(childDevices.familyId, family.familyId),
      isNull(childDevices.revokedAt),
    ),
  });
  if (!device) throw new HttpError(404, 'NOT_FOUND', 'Device not found');
  return { db, user: user!, device };
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    childProfileId: z.string().uuid().optional(),
  })
  .refine((v) => v.name !== undefined || v.childProfileId !== undefined, 'Nothing to update');

/** Rename a kid device or move it to a different child. */
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { db, user, device } = await requireFamilyDevice(req, id);
  const body = await parseBody(req, patchSchema);

  if (body.childProfileId && body.childProfileId !== device.childProfileId) {
    await requireChildProfile(db, user.id, body.childProfileId);
    await assertKidDeviceAllowed(db, device.familyId, body.childProfileId, {
      deviceId: device.id,
    });
  }

  const [updated] = await db
    .update(childDevices)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.childProfileId !== undefined ? { childProfileId: body.childProfileId } : {}),
    })
    .where(eq(childDevices.id, device.id))
    .returning();
  return json({ device: toChildDeviceDto(updated) });
});

/** Unpair: the kid device gets DEVICE_REVOKED on its next sync and resets. */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { db, device } = await requireFamilyDevice(req, id);
  await db
    .update(childDevices)
    .set({ revokedAt: new Date() })
    .where(eq(childDevices.id, device.id));
  return json({ ok: true });
});

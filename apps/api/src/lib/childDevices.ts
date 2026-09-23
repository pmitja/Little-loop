import { createHash, randomBytes, randomInt } from 'node:crypto';
import { childDevices, childProfiles, families, getDb, type Db } from '@littleloop/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getEntitlement } from './entitlement';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';

/** Pairing codes are short-lived: long enough to walk to the other device. */
export const PAIRING_LIFETIME_MS = 10 * 60 * 1000;
/** Quiet abuse cap — far above any real household. */
export const MAX_CHILD_DEVICES_PER_FAMILY = 10;

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newDeviceSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function newPairingCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Best-effort client IP for rate limiting unauthenticated kid routes. */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export interface ChildDeviceContext {
  db: Db;
  device: typeof childDevices.$inferSelect;
  child: typeof childProfiles.$inferSelect;
}

// The free plan covers kid devices for one child: the child of the family's
// oldest active kid device, so a downgrade keeps the first child's devices
// working and only the extra children's devices stop.

async function familyIsPremium(db: Db, familyId: string): Promise<boolean> {
  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { ownerUserId: true },
  });
  if (!family) return false;
  return (await getEntitlement(db, family.ownerUserId)).isPremium;
}

/**
 * Throws 402 when pairing/assigning a kid device to `childProfileId` would put
 * devices on a second child without Premium. `ignore` excludes the device
 * being reassigned, or the stale rows of an install that is re-pairing.
 * Entitlement is only read when a second child is actually involved, so the
 * common one-child family never hits RevenueCat.
 */
export async function assertKidDeviceAllowed(
  db: Db,
  familyId: string,
  childProfileId: string,
  ignore: { deviceId?: string; installId?: string } = {},
): Promise<void> {
  const active = await db.query.childDevices.findMany({
    where: and(eq(childDevices.familyId, familyId), isNull(childDevices.revokedAt)),
    columns: { id: true, childProfileId: true, installId: true },
  });
  const others = active.filter(
    (d) => d.id !== ignore.deviceId && d.installId !== ignore.installId,
  );
  if (!ignore.deviceId && others.length >= MAX_CHILD_DEVICES_PER_FAMILY) {
    throw new HttpError(409, 'DEVICE_LIMIT', 'This family has reached the kid device limit');
  }
  const otherChild = others.some((d) => d.childProfileId !== childProfileId);
  if (otherChild && !(await familyIsPremium(db, familyId))) {
    throw new HttpError(
      402,
      'PREMIUM_REQUIRED',
      'Kid devices for more than one child need Premium',
    );
  }
}

/**
 * Auth for every /api/v1/kid route except pairing: a bearer device token,
 * scoped to exactly one child profile. Never accepts a parent session, and
 * parent routes never accept this token.
 */
export async function requireChildDevice(
  req: Request,
  opts: { limitPerMinute?: number } = {},
): Promise<ChildDeviceContext> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'DEVICE_UNAUTHENTICATED', 'Missing device token');
  const db = getDb();

  // One round trip: the device, its (live) child, and which child the free
  // plan covers — the child of the family's oldest active kid device.
  const [row] = await db
    .select({
      device: childDevices,
      child: childProfiles,
      freePlanChildId: sql<string | null>`(
        select oldest.child_profile_id from child_devices as oldest
        where oldest.family_id = ${childDevices.familyId} and oldest.revoked_at is null
        order by oldest.created_at asc limit 1
      )`,
    })
    .from(childDevices)
    .innerJoin(childProfiles, eq(childProfiles.id, childDevices.childProfileId))
    .where(
      and(
        eq(childDevices.tokenHash, hashSecret(token)),
        isNull(childDevices.revokedAt),
        isNull(childProfiles.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new HttpError(401, 'DEVICE_REVOKED', 'This device is no longer paired');
  const { device, child } = row;
  rateLimit(`kid-device:${device.id}`, opts.limitPerMinute ?? 60);

  // Entitlement is only read for a second child's device, so the common
  // one-child family never touches billing here.
  if (device.childProfileId !== row.freePlanChildId && !(await familyIsPremium(db, device.familyId))) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'Kid devices for more than one child need Premium');
  }

  // Throttled: "last seen" doesn't need a write on every request.
  if (Date.now() - device.lastSeenAt.getTime() > 30 * 60 * 1000) {
    await db
      .update(childDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(childDevices.id, device.id));
  }

  return { db, device, child };
}

export function toChildDeviceDto(row: typeof childDevices.$inferSelect) {
  return {
    id: row.id,
    childProfileId: row.childProfileId,
    name: row.name,
    platform: row.platform,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

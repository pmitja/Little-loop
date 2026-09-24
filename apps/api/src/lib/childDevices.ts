import { createHash, randomBytes, randomInt } from 'node:crypto';
import { childDevices, childProfiles, families, getDb, type Db } from '@littleloop/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { FREE_LIMITS } from '@littleloop/shared';
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

// The free plan covers one kid device: the family's oldest active one, so a
// downgrade keeps the first device working and only the extra ones stop.

async function familyIsPremium(db: Db, familyId: string): Promise<boolean> {
  const family = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { ownerUserId: true },
  });
  if (!family) return false;
  return (await getEntitlement(db, family.ownerUserId)).isPremium;
}

/**
 * Throws when pairing one more kid device isn't allowed: past the abuse cap
 * (409), or past the free plan's one device without Premium (402). `ignore`
 * excludes the stale rows of an install that is re-pairing. Entitlement is
 * only read once a family already has a device, so first pairings never touch
 * RevenueCat.
 */
export async function assertKidDeviceAllowed(
  db: Db,
  familyId: string,
  ignore: { installId?: string } = {},
): Promise<void> {
  const active = await db.query.childDevices.findMany({
    where: and(eq(childDevices.familyId, familyId), isNull(childDevices.revokedAt)),
    columns: { id: true, installId: true },
  });
  const others = active.filter((d) => d.installId !== ignore.installId);
  if (others.length >= MAX_CHILD_DEVICES_PER_FAMILY) {
    throw new HttpError(409, 'DEVICE_LIMIT', 'This family has reached the kid device limit');
  }
  if (others.length >= FREE_LIMITS.kidDevices && !(await familyIsPremium(db, familyId))) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'More than one kid device needs Premium');
  }
}

/**
 * Auth for every /api/v1/kid route except pairing: a bearer device token,
 * scoped to exactly one child profile. Never accepts a parent session, and
 * parent routes never accept this token.
 */
export async function requireChildDevice(
  req: Request,
  opts: { limitPerMinute?: number; skipPlanCheck?: boolean } = {},
): Promise<ChildDeviceContext> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'DEVICE_UNAUTHENTICATED', 'Missing device token');
  const db = getDb();

  // One round trip: the device, its (live) child, and which device the free
  // plan covers — the family's oldest active kid device.
  const [row] = await db
    .select({
      device: childDevices,
      child: childProfiles,
      freePlanDeviceId: sql<string | null>`(
        select oldest.id from child_devices as oldest
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

  // Entitlement is only read for a family's extra devices, so the common
  // one-device family never touches billing here. Signing out skips the
  // check: a blocked device must still be able to leave.
  if (
    !opts.skipPlanCheck &&
    device.id !== row.freePlanDeviceId &&
    !(await familyIsPremium(db, device.familyId))
  ) {
    throw new HttpError(402, 'PREMIUM_REQUIRED', 'More than one kid device needs Premium');
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

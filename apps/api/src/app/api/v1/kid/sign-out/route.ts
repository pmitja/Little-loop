import { childDevices, familyMembers, parentSettings } from '@littleloop/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireChildDevice } from '@/lib/childDevices';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { parsePinVerifier, pinMatches } from '@/lib/pinVerifier';

const signOutSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

/** A 4-digit PIN is a 10,000-key space: keep guessing impractical. */
const PIN_ATTEMPTS = 5;

/**
 * Kid device: a grown-up logs this device out with their parent PIN (the one
 * they use on their own phone — any caregiver in the family). The PIN is
 * checked here against the stored verifier; the device never sees a hash.
 * On success the device is unpaired, exactly as if done from a parent phone.
 */
export const POST = handle(async (req) => {
  const { db, device } = await requireChildDevice(req, { skipPlanCheck: true });
  const { pin } = await parseBody(req, signOutSchema);

  // PostgreSQL locks and rechecks this row for concurrent updates. Reserve an
  // attempt before checking the PIN, across all server instances, using DB time.
  const expired = sql`(${childDevices.pinWindowEndsAt} is null or ${childDevices.pinWindowEndsAt} <= now())`;
  const [attempt] = await db
    .update(childDevices)
    .set({
      pinAttempts: sql`case when ${expired} then 1 else ${childDevices.pinAttempts} + 1 end`,
      pinWindowEndsAt: sql`case when ${expired} then now() + interval '5 minutes' else ${childDevices.pinWindowEndsAt} end`,
    })
    .where(and(
      eq(childDevices.id, device.id),
      isNull(childDevices.revokedAt),
      sql`(${expired} or ${childDevices.pinAttempts} < ${PIN_ATTEMPTS})`,
    ))
    .returning({ id: childDevices.id });
  if (!attempt) throw new HttpError(429, 'RATE_LIMITED', 'Too many requests — slow down');

  const rows = await db
    .select({ stored: parentSettings.pinRecoveryHash })
    .from(parentSettings)
    .innerJoin(familyMembers, eq(familyMembers.userId, parentSettings.userId))
    .where(eq(familyMembers.familyId, device.familyId));
  const verifiers = rows.map((row) => parsePinVerifier(row.stored)).filter((v) => v !== null);
  if (verifiers.length === 0) {
    throw new HttpError(
      409,
      'PIN_NOT_AVAILABLE',
      'Unlock LittleLoop on your phone once, or unpair this device from Settings → Kid devices',
    );
  }
  if (!verifiers.some((verifier) => pinMatches(pin, verifier))) {
    throw new HttpError(403, 'PIN_INCORRECT', 'That PIN is not right');
  }

  await db
    .update(childDevices)
    .set({ revokedAt: new Date() })
    .where(eq(childDevices.id, device.id));
  return json({ ok: true });
});

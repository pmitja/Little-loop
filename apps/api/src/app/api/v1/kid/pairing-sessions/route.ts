import { devicePairingSessions, getDb } from '@littleloop/db';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { z } from 'zod';
import {
  clientIp,
  hashSecret,
  newDeviceSecret,
  newPairingCode,
  PAIRING_LIFETIME_MS,
} from '@/lib/childDevices';
import { handle, HttpError, json, parseBody } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

const startSchema = z.object({
  installId: z.string().min(1).max(64),
  platform: z.enum(['ios', 'android']),
  deviceName: z.string().trim().min(1).max(40).optional(),
});

/**
 * Kid device, unauthenticated: open a pairing session. Returns the 6-digit code
 * to show on screen and a secret that becomes this device's token once a
 * parent claims the code. Only hashes are stored.
 */
export const POST = handle(async (req) => {
  rateLimit(`kid-pair:${clientIp(req)}`, 10);
  const body = await parseBody(req, startSchema);
  const db = getDb();
  const now = new Date();

  // Housekeeping: unclaimed sessions are useless a day after they expire.
  await db
    .delete(devicePairingSessions)
    .where(
      and(
        isNull(devicePairingSessions.claimedAt),
        lt(devicePairingSessions.expiresAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      ),
    );

  // A 6-digit space is small, so never hand out a code that is live elsewhere.
  let code: string | null = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = newPairingCode();
    const clash = await db.query.devicePairingSessions.findFirst({
      where: and(
        eq(devicePairingSessions.codeHash, hashSecret(candidate)),
        isNull(devicePairingSessions.claimedAt),
        gt(devicePairingSessions.expiresAt, now),
      ),
      columns: { id: true },
    });
    if (!clash) code = candidate;
  }
  if (!code) throw new HttpError(503, 'PAIRING_BUSY', 'Try again in a moment');

  const secret = newDeviceSecret();
  const expiresAt = new Date(now.getTime() + PAIRING_LIFETIME_MS);
  const [session] = await db
    .insert(devicePairingSessions)
    .values({
      codeHash: hashSecret(code),
      secretHash: hashSecret(secret),
      deviceName: body.deviceName ?? (body.platform === 'ios' ? 'iPhone or iPad' : 'Android device'),
      platform: body.platform,
      installId: body.installId,
      expiresAt,
    })
    .returning({ id: devicePairingSessions.id });

  return json(
    { pairing: { id: session.id, code, secret, expiresAt: expiresAt.toISOString() } },
    201,
  );
});

import { childDevices, devicePairingSessions, getDb } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { bearerToken, hashSecret } from '@/lib/childDevices';
import { handle, HttpError, json } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Kid device polls its pairing session with the secret as bearer. Once a
 * parent has claimed the code, that same secret is the device token.
 */
export const GET = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  rateLimit(`kid-pair-poll:${id}`, 90);
  const secret = bearerToken(req);
  if (!secret) throw new HttpError(401, 'DEVICE_UNAUTHENTICATED', 'Missing pairing secret');

  const db = getDb();
  const session = await db.query.devicePairingSessions.findFirst({
    where: eq(devicePairingSessions.id, id),
  });
  if (!session || session.secretHash !== hashSecret(secret)) {
    throw new HttpError(404, 'PAIRING_NOT_FOUND', 'Pairing not found');
  }

  if (session.childDeviceId) {
    const device = await db.query.childDevices.findFirst({
      where: eq(childDevices.id, session.childDeviceId),
    });
    if (device && !device.revokedAt) {
      return json({
        status: 'paired',
        device: { id: device.id, childProfileId: device.childProfileId, name: device.name },
      });
    }
  }
  if (session.expiresAt.getTime() <= Date.now() || session.claimedAt) {
    return json({ status: 'expired' });
  }
  return json({ status: 'pending', expiresAt: session.expiresAt.toISOString() });
});

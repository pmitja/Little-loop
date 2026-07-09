import { parentSettings } from '@littleloop/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/http';

const pinSettingsSchema = z.object({
  // Client-side hash — the server never sees the raw PIN (PLAN §11).
  pinRecoveryHash: z.string().min(16).max(512).nullable().optional(),
  biometricEnabled: z.boolean().optional(),
});

export const PUT = handle(async (req) => {
  const { db, user } = await requireAuth(req);
  const body = await parseBody(req, pinSettingsSchema);

  const values = {
    ...(body.pinRecoveryHash !== undefined
      ? { pinSet: body.pinRecoveryHash !== null, pinRecoveryHash: body.pinRecoveryHash }
      : {}),
    ...(body.biometricEnabled !== undefined ? { biometricEnabled: body.biometricEnabled } : {}),
  };
  await db
    .insert(parentSettings)
    .values({ userId: user!.id, ...values })
    .onConflictDoUpdate({ target: parentSettings.userId, set: values });

  return json({ ok: true });
});

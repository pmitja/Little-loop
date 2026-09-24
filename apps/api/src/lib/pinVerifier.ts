import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * The parent PIN verifier as the app stores it in `parent_settings.
 * pin_recovery_hash`: `v2$<iterations>$<salt>$<hash>`. It mirrors the device
 * keychain record (salted, iterated SHA-256 — see apps/mobile/src/lib/pin.ts),
 * so a paired kid device can ask the server to check a PIN without the hash
 * ever leaving the server. Older rows hold only the bare hash (no salt) and
 * can't be verified until that parent's app re-syncs on its next unlock.
 */
const PREFIX = 'v2';
/** Stored values come from the parent's app; bound the work a row can cause. */
const MAX_ITERATIONS = 20_000;

interface PinVerifier {
  iterations: number;
  salt: string;
  hash: string;
}

export function parsePinVerifier(stored: string | null | undefined): PinVerifier | null {
  if (!stored) return null;
  const [prefix, rawIterations, salt, hash] = stored.split('$');
  const iterations = Number(rawIterations);
  if (prefix !== PREFIX || !salt || !hash) return null;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) return null;
  return { iterations, salt, hash };
}

/** Byte-identical to the app's derive(): chained SHA-256 over hex strings. */
function derive(pin: string, salt: string, iterations: number): string {
  let digest = `${salt}:${pin}`;
  for (let i = 0; i < iterations; i++) {
    digest = createHash('sha256').update(digest, 'utf8').digest('hex');
  }
  return digest;
}

export function pinMatches(pin: string, verifier: PinVerifier): boolean {
  const candidate = Buffer.from(derive(pin, verifier.salt, verifier.iterations));
  const expected = Buffer.from(verifier.hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

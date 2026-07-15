import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { api, apiConfigured } from '@/lib/api';

/**
 * PIN storage per PLAN §11: salted, iterated SHA-256 kept in the device
 * Keychain/Keystore. The raw PIN never persists and never leaves the device.
 * Threat model is a curious child, not an attacker.
 */
const PIN_HASH_KEY = 'littleloop.pinHash';
const PIN_SALT_KEY = 'littleloop.pinSalt';
const PIN_PARAMS_KEY = 'littleloop.pinParams';

/**
 * Iteration count for records written today.
 *
 * This used to be 10,000, which cost seconds on every unlock — see derive() for
 * why. The count was buying nothing: a 4-digit PIN is a 10,000-key space, so
 * anyone who can read the hash out of the Keystore brute-forces the whole space
 * regardless of how it was stretched. The Keystore is the protection; the
 * stretching only has to stop a casual read.
 */
const ITERATIONS = 1_000;

/** Records written before the params key existed used 10,000 iterations. */
const LEGACY_ITERATIONS = 10_000;

type PinParams = { iterations: number };

/**
 * Chained SHA-256, salt-prefixed.
 *
 * Hashing runs in JS rather than through expo-crypto. Its digest API is
 * async-only, so the loop used to `await` a native call per iteration — 10,000
 * bridge round trips for a single PIN check, which is what made unlocking slow.
 * The output is byte-identical to the old native path, so stored hashes from
 * either implementation still verify.
 */
function derive(pin: string, salt: string, iterations: number): string {
  let digest = `${salt}:${pin}`;
  for (let i = 0; i < iterations; i++) {
    digest = bytesToHex(sha256(utf8ToBytes(digest)));
  }
  return digest;
}

async function readParams(): Promise<PinParams> {
  const raw = await SecureStore.getItemAsync(PIN_PARAMS_KEY);
  if (!raw) return { iterations: LEGACY_ITERATIONS };
  try {
    const parsed = JSON.parse(raw) as Partial<PinParams>;
    return { iterations: parsed.iterations ?? LEGACY_ITERATIONS };
  } catch {
    return { iterations: LEGACY_ITERATIONS };
  }
}

export async function savePin(pin: string): Promise<void> {
  const salt = Crypto.getRandomBytes(16).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
  const hash = derive(pin, salt, ITERATIONS);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(PIN_PARAMS_KEY, JSON.stringify({ iterations: ITERATIONS }));
  void syncPinSettings(hash);
}

/**
 * Best-effort mirror of PIN state to PUT /settings/pin (PLAN §11): the server
 * stores only the client-side hash as a recovery reference plus the pin_set
 * flag — never the raw PIN. Offline/unconfigured failures are ignored; the
 * device keychain stays the source of truth.
 */
function syncPinSettings(pinRecoveryHash: string | null): Promise<void> {
  if (!apiConfigured()) return Promise.resolve();
  return api('/settings/pin', {
    method: 'PUT',
    body: JSON.stringify({ pinRecoveryHash }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, expected, params] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
    readParams(),
  ]);
  if (!salt || !expected) return false;
  if (derive(pin, salt, params.iterations) !== expected) return false;

  // A PIN set before the iteration change still verifies against the old count.
  // Re-save it at the current one so this parent only pays that cost once.
  if (params.iterations !== ITERATIONS) await savePin(pin);
  return true;
}

export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(PIN_SALT_KEY),
    SecureStore.deleteItemAsync(PIN_PARAMS_KEY),
  ]);
  void syncPinSettings(null);
}

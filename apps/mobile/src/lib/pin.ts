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
const ITERATIONS = 10_000;

async function derive(pin: string, salt: string): Promise<string> {
  let digest = `${salt}:${pin}`;
  for (let i = 0; i < ITERATIONS; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}

export async function savePin(pin: string): Promise<void> {
  const salt = Crypto.getRandomBytes(16).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
  const hash = await derive(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
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
  const [salt, expected] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ]);
  if (!salt || !expected) return false;
  return (await derive(pin, salt)) === expected;
}

export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(PIN_SALT_KEY),
  ]);
  void syncPinSettings(null);
}

import * as SecureStore from 'expo-secure-store';
import { storage } from '@/lib/storage';

/**
 * SecureStore, with a development-only escape hatch.
 *
 * A simulator build made with `CODE_SIGNING_ALLOWED=NO` carries no entitlements,
 * so every Keychain call throws "A required entitlement isn't present"
 * (errSecMissingEntitlement) — and the auth client reads the Keychain at import,
 * so the whole app dies before the first screen. In __DEV__ only, a refused
 * Keychain falls back to the app's MMKV store so local testing still works.
 * Release builds are always signed and always use the Keychain; they never
 * take this path.
 */
const DEV_PREFIX = 'dev-insecure:';
let keychainBroken = false;

function fallback<T>(error: unknown, run: () => T): T {
  if (!__DEV__) throw error;
  if (!keychainBroken) {
    keychainBroken = true;
    console.warn('[secureStore] Keychain unavailable (unsigned dev build) — using MMKV for secrets in development.');
  }
  return run();
}

function devGet(key: string): string | null {
  const value = storage.getItem(DEV_PREFIX + key);
  return typeof value === 'string' ? value : null;
}

export function getItem(key: string): string | null {
  if (keychainBroken) return devGet(key);
  try {
    return SecureStore.getItem(key);
  } catch (error) {
    return fallback(error, () => devGet(key));
  }
}

export function setItem(key: string, value: string): void {
  if (keychainBroken) return void storage.setItem(DEV_PREFIX + key, value);
  try {
    SecureStore.setItem(key, value);
  } catch (error) {
    fallback(error, () => storage.setItem(DEV_PREFIX + key, value));
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (keychainBroken) return devGet(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    return fallback(error, () => devGet(key));
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (keychainBroken) return void storage.setItem(DEV_PREFIX + key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    fallback(error, () => storage.setItem(DEV_PREFIX + key, value));
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (keychainBroken) return void storage.removeItem(DEV_PREFIX + key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    fallback(error, () => storage.removeItem(DEV_PREFIX + key));
  }
}

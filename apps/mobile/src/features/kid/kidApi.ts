import * as SecureStore from 'expo-secure-store';
import { ApiError, apiRequest } from '@/lib/api';

/**
 * Kid-device credential. While pairing it is the pairing secret; once a parent
 * claims the code the server promotes that same secret to this device's token.
 * Keychain/Keystore only — never in MMKV.
 */
const KID_TOKEN_KEY = 'littleloop.kidDeviceToken';

export function getKidToken(): string | null {
  return SecureStore.getItem(KID_TOKEN_KEY);
}

export function setKidToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(KID_TOKEN_KEY, token);
}

export function clearKidToken(): Promise<void> {
  return SecureStore.deleteItemAsync(KID_TOKEN_KEY);
}

type RevokedHandler = () => void;
let onRevoked: RevokedHandler = () => {};

/** Installed by the kid sync module; avoids an import cycle with the stores. */
export function setKidRevokedHandler(handler: RevokedHandler) {
  onRevoked = handler;
}

/** Authed call for /kid/* routes: bearer device token, never the parent cookie. */
export async function kidApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getKidToken();
  if (!token) throw new ApiError(401, 'DEVICE_UNAUTHENTICATED', 'No device token');
  try {
    return await apiRequest<T>(path, init, { Authorization: `Bearer ${token}` });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DEVICE_REVOKED') onRevoked();
    throw error;
  }
}

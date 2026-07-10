import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { api, apiConfigured } from '@/lib/api';
import { storage } from '@/lib/storage';

const INSTALL_ID_KEY = 'littleloop.installId';

async function getInstallId(): Promise<string> {
  const existing = await storage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await storage.setItem(INSTALL_ID_KEY, created);
  return created;
}

/** Create/update the API user row required by every authenticated endpoint. */
export async function syncCurrentUser(): Promise<void> {
  if (!apiConfigured() || Platform.OS === 'web') return;

  await api('/users/sync', {
    method: 'POST',
    body: JSON.stringify({
      installId: await getInstallId(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
    }),
  });
}

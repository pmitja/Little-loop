import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import type { ChildProfile, FamilyRole } from '@littleloop/shared';
import { api, apiConfigured } from '@/lib/api';
import { storage } from '@/lib/storage';
import { useAppStore } from '@/stores/appStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useTimerStore } from '@/stores/timerStore';

const INSTALL_ID_KEY = 'littleloop.installId';

export async function getInstallId(): Promise<string> {
  const existing = await storage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await storage.setItem(INSTALL_ID_KEY, created);
  return created;
}

/** Create/update the API user row required by every authenticated endpoint. */
export async function syncCurrentUser(): Promise<void> {
  if (!apiConfigured() || Platform.OS === 'web') return;

  const result = await api<{
    family: { id: string; role: FamilyRole };
    entitlement: { isPremium: boolean };
    childProfiles: ChildProfile[];
  }>('/users/sync', {
    method: 'POST',
    body: JSON.stringify({
      installId: await getInstallId(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
    }),
  });
  useAppStore.getState().setFamilyRole(result.family.role);
  useEntitlementStore.getState().setFamilyPremium(result.entitlement.isPremium);
  useAppStore.getState().setChildProfiles(result.childProfiles);
  if (result.childProfiles.length === 0) {
    usePlaylistStore.setState({ videosByChild: {}, playlistIdByChild: {} });
    useTimerStore.setState({ secondsByChild: {}, sessions: [], activeSessionId: null });
  }
}

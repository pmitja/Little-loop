import type { ChildProfile } from '@littleloop/shared';
import { api, ApiError, apiConfigured } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { syncFamilyPlaylists } from './playlistSync';
import { syncCurrentUser } from '@/lib/userSync';
import { useEntitlementStore } from '@/stores/entitlementStore';

/**
 * Pull the account's profiles from the server into the local cache.
 *
 * The client used to be write-only: it POSTed profiles but never read them back,
 * so a reinstall (or a second device) started with an empty local store, ran
 * onboarding again, and tried to create a profile the account already had — which
 * the free-tier cap rejects with a 402 and no way forward. Adopting server truth
 * before we ever offer profile creation is what keeps that from happening.
 *
 * Best-effort: a failure leaves the local cache untouched so offline still works.
 * Returns the adopted profiles, or null if the API is off or unreachable.
 */
export async function syncChildProfiles(): Promise<ChildProfile[] | null> {
  if (!apiConfigured()) return null;
  try {
    const res = await api<{ childProfiles: ChildProfile[] }>('/child-profiles');
    const profiles = res.childProfiles ?? [];
    // Never let an empty server response wipe profiles created while offline.
    if (profiles.length > 0) {
      useAppStore.getState().setChildProfiles(profiles);
      await syncFamilyPlaylists(profiles);
    }
    return profiles;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'FAMILY_NOT_FOUND') {
      await syncCurrentUser().catch(() => {});
    } else if (error instanceof ApiError && error.code === 'PREMIUM_REQUIRED') {
      useEntitlementStore.getState().setFamilyPremium(false);
    }
    return null;
  }
}

import type { ChildProfile } from '@littleloop/shared';
import { api, apiConfigured } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';

/**
 * Save a profile change locally and mirror it to the account.
 *
 * The local store is what child mode actually enforces, so it moves first and the
 * screen stays responsive. The PATCH is what makes the change survive a reinstall
 * or reach a second device — syncChildProfiles() adopts server truth on launch, so
 * a change that never lands in the database silently reverts on the next cold start.
 *
 * Returns false when the server write failed, so the caller can tell the parent
 * rather than leaving them believing a screen-time limit is saved when it isn't.
 * The local value is kept either way: it's still what enforces the limit on this
 * device, and dropping it would lose the change outright.
 */
export async function updateChildProfile(
  id: string,
  patch: Partial<ChildProfile>,
): Promise<boolean> {
  useAppStore.getState().updateChildProfile(id, patch);
  if (!apiConfigured()) return true; // No API in this build — local is all there is.
  try {
    await api(`/child-profiles/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return true;
  } catch {
    return false;
  }
}

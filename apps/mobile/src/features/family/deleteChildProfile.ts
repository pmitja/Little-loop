import { api, apiConfigured } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useTimerStore } from '@/stores/timerStore';

/**
 * Delete a child profile everywhere: best-effort server soft-delete, then every
 * local store that keys data by the profile id (rules, playlist, watch history).
 */
export async function deleteChildProfile(id: string): Promise<void> {
  if (apiConfigured()) {
    try {
      await api(`/child-profiles/${id}`, { method: 'DELETE' });
    } catch {
      // Local-only profile or API offline — remove locally; sync reconciles later.
    }
  }
  useAppStore.getState().removeChildProfile(id);
  usePlaylistStore.getState().removeChildData(id);
  useTimerStore.getState().removeChildData(id);
}

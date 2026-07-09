import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { FREE_LIMITS, type PlaylistVideo, type VideoMeta } from '@littleloop/shared';
import { storage } from '@/lib/storage';
import { markHydrated } from '@/stores/appStore';
import { useEntitlementStore } from '@/stores/entitlementStore';

export type AddVideoResult = 'added' | 'duplicate' | 'limit';

interface PlaylistState {
  /**
   * Local cache of each child's single playlist, keyed by childProfileId
   * (server truth moves to TanStack Query once the playlist API is live).
   */
  videosByChild: Record<string, PlaylistVideo[]>;
  addVideo: (childProfileId: string, video: VideoMeta) => AddVideoResult;
  removeVideo: (childProfileId: string, playlistVideoId: string) => void;
  reorderVideos: (childProfileId: string, orderedIds: string[]) => void;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      videosByChild: {},
      addVideo: (childProfileId, video) => {
        const current = get().videosByChild[childProfileId] ?? [];
        if (current.some((v) => v.video.providerVideoId === video.providerVideoId)) {
          return 'duplicate';
        }
        // Premium removes the per-playlist cap (PLAN §12); server 402 is the
        // backstop once the API is wired.
        if (
          current.length >= FREE_LIMITS.videosPerPlaylist &&
          !useEntitlementStore.getState().premium
        ) {
          return 'limit';
        }
        const entry: PlaylistVideo = {
          id: Crypto.randomUUID(),
          video,
          addedAt: new Date().toISOString(),
        };
        set((s) => ({
          videosByChild: { ...s.videosByChild, [childProfileId]: [...current, entry] },
        }));
        return 'added';
      },
      removeVideo: (childProfileId, playlistVideoId) =>
        set((s) => ({
          videosByChild: {
            ...s.videosByChild,
            [childProfileId]: (s.videosByChild[childProfileId] ?? []).filter(
              (v) => v.id !== playlistVideoId,
            ),
          },
        })),
      reorderVideos: (childProfileId, orderedIds) =>
        set((s) => {
          const current = s.videosByChild[childProfileId] ?? [];
          // Ignore stale orders that aren't a permutation of the current set (PLAN §8).
          if (
            orderedIds.length !== current.length ||
            !orderedIds.every((id) => current.some((v) => v.id === id))
          ) {
            return s;
          }
          const byId = new Map(current.map((v) => [v.id, v]));
          return {
            videosByChild: {
              ...s.videosByChild,
              [childProfileId]: orderedIds.map((id) => byId.get(id)!),
            },
          };
        }),
    }),
    {
      name: 'playlist-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('playlist');
      },
    },
  ),
);

/** The active child's playlist, empty until a profile exists. */
export function usePlaylistVideos(childProfileId: string | null): PlaylistVideo[] {
  return usePlaylistStore((s) =>
    childProfileId ? (s.videosByChild[childProfileId] ?? EMPTY) : EMPTY,
  );
}

const EMPTY: PlaylistVideo[] = [];

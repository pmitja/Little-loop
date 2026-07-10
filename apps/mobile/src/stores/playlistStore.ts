import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { FREE_LIMITS, type PlaylistVideo, type VideoMeta } from '@littleloop/shared';
import { storage } from '@/lib/storage';
import { markHydrated } from '@/stores/appStore';
import { useEntitlementStore } from '@/stores/entitlementStore';

export type AddVideoResult = 'added' | 'duplicate' | 'limit';

export interface PlaybackProgress {
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
}

interface PlaylistState {
  /**
   * Local cache of each child's single playlist, keyed by childProfileId
   * (server truth moves to TanStack Query once the playlist API is live).
   */
  videosByChild: Record<string, PlaylistVideo[]>;
  playbackProgressByChild: Record<string, Record<string, PlaybackProgress>>;
  addVideo: (childProfileId: string, video: VideoMeta, status?: 'review' | 'live') => AddVideoResult;
  setVideoStatus: (childProfileId: string, playlistVideoId: string, status: 'review' | 'live') => void;
  removeVideo: (childProfileId: string, playlistVideoId: string) => void;
  reorderVideos: (childProfileId: string, orderedIds: string[]) => void;
  savePlaybackProgress: (
    childProfileId: string,
    providerVideoId: string,
    positionSeconds: number,
    durationSeconds: number,
  ) => void;
  clearPlaybackProgress: (childProfileId: string, providerVideoId: string) => void;
  /** Drop everything stored for a child (profile deleted). */
  removeChildData: (childProfileId: string) => void;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      videosByChild: {},
      playbackProgressByChild: {},
      addVideo: (childProfileId, video, status = 'review') => {
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
          status,
        };
        set((s) => ({
          videosByChild: { ...s.videosByChild, [childProfileId]: [...current, entry] },
        }));
        return 'added';
      },
      setVideoStatus: (childProfileId, playlistVideoId, status) =>
        set((s) => ({
          videosByChild: {
            ...s.videosByChild,
            [childProfileId]: (s.videosByChild[childProfileId] ?? []).map((video) =>
              video.id === playlistVideoId ? { ...video, status } : video,
            ),
          },
        })),
      removeVideo: (childProfileId, playlistVideoId) =>
        set((s) => {
          const removed = (s.videosByChild[childProfileId] ?? []).find(
            (video) => video.id === playlistVideoId,
          );
          const childProgress = { ...(s.playbackProgressByChild?.[childProfileId] ?? {}) };
          if (removed) delete childProgress[removed.video.providerVideoId];
          return {
            videosByChild: {
              ...s.videosByChild,
              [childProfileId]: (s.videosByChild[childProfileId] ?? []).filter(
                (video) => video.id !== playlistVideoId,
              ),
            },
            playbackProgressByChild: {
              ...s.playbackProgressByChild,
              [childProfileId]: childProgress,
            },
          };
        }),
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
      savePlaybackProgress: (
        childProfileId,
        providerVideoId,
        positionSeconds,
        durationSeconds,
      ) =>
        set((s) => {
          const position = Math.max(0, positionSeconds);
          const duration = Math.max(0, durationSeconds);
          const isAtStart = position < 3;
          const isComplete =
            duration > 0 && (position >= duration - 10 || position / duration >= 0.95);
          const childProgress = { ...(s.playbackProgressByChild?.[childProfileId] ?? {}) };

          if (isAtStart || isComplete) {
            if (!childProgress[providerVideoId]) return s;
            delete childProgress[providerVideoId];
          } else {
            childProgress[providerVideoId] = {
              positionSeconds: position,
              durationSeconds: duration,
              updatedAt: Date.now(),
            };
          }

          return {
            playbackProgressByChild: {
              ...s.playbackProgressByChild,
              [childProfileId]: childProgress,
            },
          };
        }),
      clearPlaybackProgress: (childProfileId, providerVideoId) =>
        set((s) => {
          const childProgress = { ...(s.playbackProgressByChild?.[childProfileId] ?? {}) };
          if (!childProgress[providerVideoId]) return s;
          delete childProgress[providerVideoId];
          return {
            playbackProgressByChild: {
              ...s.playbackProgressByChild,
              [childProfileId]: childProgress,
            },
          };
        }),
      removeChildData: (childProfileId) =>
        set((s) => {
          const { [childProfileId]: _videos, ...videosByChild } = s.videosByChild;
          const { [childProfileId]: _progress, ...playbackProgressByChild } =
            s.playbackProgressByChild ?? {};
          return { videosByChild, playbackProgressByChild };
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

/**
 * Child surfaces only ever receive explicitly live items; old persisted entries are safe/live.
 * Filtering happens outside the selector: a `.filter()` inside would return a fresh array
 * reference on every snapshot read and send useSyncExternalStore into an infinite re-render.
 */
export function useLivePlaylistVideos(childProfileId: string | null): PlaylistVideo[] {
  const all = usePlaylistVideos(childProfileId);
  return useMemo(() => all.filter((v) => (v.status ?? 'live') === 'live'), [all]);
}

export function usePlaybackProgress(
  childProfileId: string | null,
): Record<string, PlaybackProgress> {
  return usePlaylistStore((s) =>
    childProfileId ? (s.playbackProgressByChild?.[childProfileId] ?? EMPTY_PROGRESS) : EMPTY_PROGRESS,
  );
}

const EMPTY: PlaylistVideo[] = [];
const EMPTY_PROGRESS: Record<string, PlaybackProgress> = {};

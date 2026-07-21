import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { storage } from '@/lib/storage';
import { markHydrated } from '@/stores/appStore';

/** Cap pending requests per child so a bored kid can't flood the parent queue. */
const MAX_PENDING_PER_CHILD = 10;

export interface WatchRequest {
  id: string;
  childProfileId: string;
  /** 'more' = generic "give me more"; 'channel' = "more from this creator". */
  kind: 'more' | 'channel';
  channelTitle?: string;
  thumbnailUrl?: string;
  /** A providerVideoId from that channel — lets the parent resolve the channel (Phase 2). */
  sampleVideoId?: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

interface RequestOptions {
  channelTitle?: string;
  thumbnailUrl?: string;
  sampleVideoId?: string;
}

/** The minimal video shape a heart-tap needs to raise a channel request. */
interface LikeableVideo {
  providerVideoId: string;
  channelTitle?: string;
  thumbnailUrl?: string;
}

interface RequestState {
  requestsByChild: Record<string, WatchRequest[]>;
  /** providerVideoIds the child has hearted, per child — drives the filled state. */
  likedByChild: Record<string, string[]>;
  addRequest: (childProfileId: string, kind: WatchRequest['kind'], opts?: RequestOptions) => void;
  /**
   * Child taps the heart on a video. Toggles the local liked state and, when
   * newly liked, raises the same "more from this creator" request the parent
   * already handles. Returns the new liked state so callers can react.
   */
  toggleLike: (childProfileId: string, video: LikeableVideo) => boolean;
  resolveRequest: (childProfileId: string, requestId: string) => void;
  removeRequest: (childProfileId: string, requestId: string) => void;
  /** Drop everything stored for a child (profile deleted). */
  removeChildData: (childProfileId: string) => void;
}

export const useRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requestsByChild: {},
      likedByChild: {},
      toggleLike: (childProfileId, video) => {
        const liked = get().likedByChild[childProfileId] ?? [];
        const alreadyLiked = liked.includes(video.providerVideoId);
        if (alreadyLiked) {
          set((s) => ({
            likedByChild: {
              ...s.likedByChild,
              [childProfileId]: (s.likedByChild[childProfileId] ?? []).filter(
                (id) => id !== video.providerVideoId,
              ),
            },
          }));
          return false;
        }
        set((s) => ({
          likedByChild: {
            ...s.likedByChild,
            [childProfileId]: [...(s.likedByChild[childProfileId] ?? []), video.providerVideoId],
          },
        }));
        // A heart is a concrete "I like this creator" — raise the same channel
        // request the parent approves. Coalescing (one row per channel) lives in
        // addRequest, so hearting several videos from one creator stays tidy.
        get().addRequest(childProfileId, 'channel', {
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          sampleVideoId: video.providerVideoId,
        });
        return true;
      },
      addRequest: (childProfileId, kind, opts = {}) =>
        set((s) => {
          const current = s.requestsByChild[childProfileId] ?? [];
          const now = new Date().toISOString();

          // Coalesce repeat asks: one pending 'more', one pending row per channel.
          const duplicate = current.find(
            (r) =>
              r.status === 'pending' &&
              r.kind === kind &&
              (kind === 'more' || r.channelTitle === opts.channelTitle),
          );
          if (duplicate) {
            return {
              requestsByChild: {
                ...s.requestsByChild,
                [childProfileId]: current.map((r) =>
                  r.id === duplicate.id ? { ...r, createdAt: now } : r,
                ),
              },
            };
          }

          const pendingCount = current.filter((r) => r.status === 'pending').length;
          if (pendingCount >= MAX_PENDING_PER_CHILD) return s;

          const entry: WatchRequest = {
            id: Crypto.randomUUID(),
            childProfileId,
            kind,
            channelTitle: opts.channelTitle,
            thumbnailUrl: opts.thumbnailUrl,
            sampleVideoId: opts.sampleVideoId,
            createdAt: now,
            status: 'pending',
          };
          return {
            requestsByChild: {
              ...s.requestsByChild,
              [childProfileId]: [...current, entry],
            },
          };
        }),
      resolveRequest: (childProfileId, requestId) =>
        set((s) => ({
          requestsByChild: {
            ...s.requestsByChild,
            [childProfileId]: (s.requestsByChild[childProfileId] ?? []).map((r) =>
              r.id === requestId ? { ...r, status: 'resolved' } : r,
            ),
          },
        })),
      removeRequest: (childProfileId, requestId) =>
        set((s) => ({
          requestsByChild: {
            ...s.requestsByChild,
            [childProfileId]: (s.requestsByChild[childProfileId] ?? []).filter(
              (r) => r.id !== requestId,
            ),
          },
        })),
      removeChildData: (childProfileId) =>
        set((s) => {
          const { [childProfileId]: _dropped, ...requestsByChild } = s.requestsByChild;
          const { [childProfileId]: _likes, ...likedByChild } = s.likedByChild;
          return { requestsByChild, likedByChild };
        }),
    }),
    {
      name: 'request-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('request');
      },
    },
  ),
);

const EMPTY: WatchRequest[] = [];

/**
 * Pending requests for a child. Filtering happens in a useMemo outside the
 * selector — a `.filter()` inside returns a fresh array on every snapshot and
 * sends useSyncExternalStore into an infinite loop (same as useLivePlaylistVideos).
 */
export function usePendingRequests(childProfileId: string | null): WatchRequest[] {
  const all = useRequestStore((s) =>
    childProfileId ? (s.requestsByChild[childProfileId] ?? EMPTY) : EMPTY,
  );
  return useMemo(() => all.filter((r) => r.status === 'pending'), [all]);
}

export function usePendingRequestCount(childProfileId: string | null): number {
  return usePendingRequests(childProfileId).length;
}

const EMPTY_LIKES: string[] = [];

/** The set of providerVideoIds a child has hearted (stable reference). */
export function useLikedVideoIds(childProfileId: string | null): string[] {
  return useRequestStore((s) =>
    childProfileId ? (s.likedByChild[childProfileId] ?? EMPTY_LIKES) : EMPTY_LIKES,
  );
}

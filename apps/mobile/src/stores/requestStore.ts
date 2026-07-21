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

interface RequestState {
  requestsByChild: Record<string, WatchRequest[]>;
  addRequest: (childProfileId: string, kind: WatchRequest['kind'], opts?: RequestOptions) => void;
  resolveRequest: (childProfileId: string, requestId: string) => void;
  removeRequest: (childProfileId: string, requestId: string) => void;
  /** Drop everything stored for a child (profile deleted). */
  removeChildData: (childProfileId: string) => void;
}

export const useRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requestsByChild: {},
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
          return { requestsByChild };
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

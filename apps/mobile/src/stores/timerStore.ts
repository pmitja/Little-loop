import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { storage } from '@/lib/storage';
import { markHydrated } from '@/stores/appStore';

export type SessionEndReason = 'parent_exit' | 'time_limit' | 'bedtime' | 'app_closed';

export interface WatchSession {
  id: string;
  childProfileId: string;
  startedAt: string;
  endedAt: string | null;
  seconds: number;
  /** Distinct providerVideoIds played during the session. */
  videoIds: string[];
  endReason: SessionEndReason | null;
}

/** Device-local day boundary per PLAN §13. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MAX_SESSIONS = 50;

interface TimerState {
  dateKey: string;
  /** Seconds watched today per child profile (resets at local midnight). */
  secondsByChild: Record<string, number>;
  /** Recent sessions, newest last — feeds the Activity screen (free tier: local only). */
  sessions: WatchSession[];
  activeSessionId: string | null;
  startSession: (childProfileId: string) => void;
  /** 1 Hz tick from the player, only while state is PLAYING. */
  addSecond: (childProfileId: string, providerVideoId: string) => void;
  endSession: (reason: SessionEndReason) => void;
  /**
   * Close a session left open by an app kill (PLAN §13 local reconciliation).
   * Its counted seconds were persisted with every tick, so nothing is lost.
   */
  reconcile: () => void;
  /** Drop counts and history for a child (profile deleted). */
  removeChildData: (childProfileId: string) => void;
}

/** Roll persisted counts across the local-midnight boundary. */
function withFreshDay<T extends Pick<TimerState, 'dateKey' | 'secondsByChild'>>(s: T): T {
  const key = todayKey();
  if (s.dateKey === key) return s;
  return { ...s, dateKey: key, secondsByChild: {} };
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      dateKey: todayKey(),
      secondsByChild: {},
      sessions: [],
      activeSessionId: null,
      startSession: (childProfileId) => {
        // A lingering open session (shouldn't happen, but be safe) is closed first.
        if (get().activeSessionId) get().endSession('app_closed');
        const session: WatchSession = {
          id: Crypto.randomUUID(),
          childProfileId,
          startedAt: new Date().toISOString(),
          endedAt: null,
          seconds: 0,
          videoIds: [],
          endReason: null,
        };
        set((s) => ({
          ...withFreshDay(s),
          sessions: [...s.sessions.slice(-(MAX_SESSIONS - 1)), session],
          activeSessionId: session.id,
        }));
      },
      addSecond: (childProfileId, providerVideoId) =>
        set((s) => {
          const fresh = withFreshDay(s);
          return {
            ...fresh,
            secondsByChild: {
              ...fresh.secondsByChild,
              [childProfileId]: (fresh.secondsByChild[childProfileId] ?? 0) + 1,
            },
            sessions: fresh.sessions.map((sess) =>
              sess.id === fresh.activeSessionId
                ? {
                    ...sess,
                    seconds: sess.seconds + 1,
                    videoIds: sess.videoIds.includes(providerVideoId)
                      ? sess.videoIds
                      : [...sess.videoIds, providerVideoId],
                  }
                : sess,
            ),
          };
        }),
      endSession: (reason) =>
        set((s) => {
          if (!s.activeSessionId) return s;
          return {
            sessions: s.sessions.map((sess) =>
              sess.id === s.activeSessionId
                ? { ...sess, endedAt: new Date().toISOString(), endReason: reason }
                : sess,
            ),
            activeSessionId: null,
          };
        }),
      reconcile: () =>
        set((s) => {
          if (!s.activeSessionId) return withFreshDay(s);
          return {
            ...withFreshDay(s),
            sessions: s.sessions.map((sess) =>
              sess.id === s.activeSessionId
                ? { ...sess, endedAt: new Date().toISOString(), endReason: 'app_closed' as const }
                : sess,
            ),
            activeSessionId: null,
          };
        }),
      removeChildData: (childProfileId) =>
        set((s) => {
          const { [childProfileId]: _seconds, ...secondsByChild } = s.secondsByChild;
          const sessions = s.sessions.filter((sess) => sess.childProfileId !== childProfileId);
          return {
            secondsByChild,
            sessions,
            activeSessionId: sessions.some((sess) => sess.id === s.activeSessionId)
              ? s.activeSessionId
              : null,
          };
        }),
    }),
    {
      name: 'timer-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('timer');
      },
    },
  ),
);

/** Local-date key for an ISO timestamp (same format as todayKey). */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Last 7 local days (oldest first), each with total minutes watched by the child. */
export function weeklyMinutes(
  sessions: WatchSession[],
  childProfileId: string | null,
): { key: string; minutes: number }[] {
  const days: { key: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ key: localDayKey(d.toISOString()), minutes: 0 });
  }
  for (const s of sessions) {
    if (childProfileId && s.childProfileId !== childProfileId) continue;
    const day = days.find((d) => d.key === localDayKey(s.startedAt));
    if (day) day.minutes += s.seconds / 60;
  }
  return days;
}

/** Distinct providerVideoIds the child played today (session order). */
export function videosWatchedToday(sessions: WatchSession[], childProfileId: string | null): string[] {
  const ids: string[] = [];
  const today = todayKey();
  for (const s of sessions) {
    if (childProfileId && s.childProfileId !== childProfileId) continue;
    if (localDayKey(s.startedAt) !== today) continue;
    for (const id of s.videoIds) if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Seconds this child has watched today (0 once the local day rolls over). */
export function useSecondsWatchedToday(childProfileId: string | null): number {
  return useTimerStore((s) => {
    if (!childProfileId || s.dateKey !== todayKey()) return 0;
    return s.secondsByChild[childProfileId] ?? 0;
  });
}

/** Remaining seconds against a daily limit; null limit = unlimited. */
export function remainingSeconds(limitMinutes: number | null | undefined, watched: number): number | null {
  if (limitMinutes == null) return null;
  return Math.max(0, limitMinutes * 60 - watched);
}

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';
import { markHydrated } from './appStore';

interface LockState {
  pinSet: boolean;
  childMode: { active: boolean; enteredAt: number | null };
  failedAttempts: number;
  lockoutUntil: number | null;
  setPinSet: (set: boolean) => void;
  setChildMode: (active: boolean) => void;
  recordFailedAttempt: () => void;
  resetAttempts: () => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = [30_000];

export const useLockStore = create<LockState>()(
  persist(
    (set) => ({
      pinSet: false,
      childMode: { active: false, enteredAt: null },
      failedAttempts: 0,
      lockoutUntil: null,
      setPinSet: (pinSet) => set({ pinSet }),
      setChildMode: (active) =>
        set({ childMode: { active, enteredAt: active ? Date.now() : null } }),
      recordFailedAttempt: () =>
        set((s) => {
          const failedAttempts = s.failedAttempts + 1;
          if (failedAttempts >= MAX_ATTEMPTS) {
            const tier = Math.min(
              Math.floor(failedAttempts / MAX_ATTEMPTS) - 1,
              LOCKOUT_MS.length - 1,
            );
            return { failedAttempts, lockoutUntil: Date.now() + LOCKOUT_MS[tier] };
          }
          return { failedAttempts };
        }),
      resetAttempts: () => set({ failedAttempts: 0, lockoutUntil: null }),
    }),
    {
      name: 'lock-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('lock');
      },
    },
  ),
);

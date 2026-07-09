import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';
import { markHydrated } from './appStore';

interface LockState {
  pinSet: boolean;
  biometricEnabled: boolean;
  childMode: { active: boolean; enteredAt: number | null };
  failedAttempts: number;
  lockoutUntil: number | null;
  setPinSet: (set: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setChildMode: (active: boolean) => void;
  recordFailedAttempt: () => void;
  resetAttempts: () => void;
}

const MAX_ATTEMPTS = 5;
// Escalating lockouts per PLAN §11: 30 s, 2 min, 5 min.
const LOCKOUT_MS = [30_000, 120_000, 300_000];

export const useLockStore = create<LockState>()(
  persist(
    (set) => ({
      pinSet: false,
      biometricEnabled: false,
      childMode: { active: false, enteredAt: null },
      failedAttempts: 0,
      lockoutUntil: null,
      setPinSet: (pinSet) => set({ pinSet }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
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

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

/**
 * Last-known entitlement, cached in MMKV per PLAN §12: honored offline
 * indefinitely for reading content; gated writes re-check with the store/server.
 */
interface EntitlementState {
  premium: boolean;
  /** ISO timestamp of the last confirmation from RevenueCat (null = never). */
  updatedAt: string | null;
  setPremium: (premium: boolean) => void;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set) => ({
      premium: false,
      updatedAt: null,
      setPremium: (premium) => set({ premium, updatedAt: new Date().toISOString() }),
    }),
    { name: 'entitlement-store', storage: createJSONStorage(() => storage) },
  ),
);

export function usePremium(): boolean {
  return useEntitlementStore((s) => s.premium);
}

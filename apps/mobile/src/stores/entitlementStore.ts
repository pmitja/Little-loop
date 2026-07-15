import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

/**
 * Last-known entitlement, cached in MMKV per PLAN §12: honored offline
 * indefinitely for reading content; gated writes re-check with the store/server.
 */
interface EntitlementState {
  premium: boolean;
  storePremium: boolean;
  familyPremium: boolean;
  /** ISO timestamp of the last confirmation from RevenueCat (null = never). */
  updatedAt: string | null;
  setPremium: (premium: boolean) => void;
  setFamilyPremium: (premium: boolean) => void;
  clearPremium: () => void;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set) => ({
      premium: false,
      storePremium: false,
      familyPremium: false,
      updatedAt: null,
      setPremium: (storePremium) =>
        set((state) => ({
          storePremium,
          premium: storePremium || (state.familyPremium ?? false),
          updatedAt: new Date().toISOString(),
        })),
      setFamilyPremium: (familyPremium) =>
        set((state) => ({
          familyPremium,
          premium: familyPremium || (state.storePremium ?? false),
          updatedAt: new Date().toISOString(),
        })),
      clearPremium: () =>
        set({ premium: false, storePremium: false, familyPremium: false, updatedAt: null }),
    }),
    { name: 'entitlement-store', storage: createJSONStorage(() => storage) },
  ),
);

export function usePremium(): boolean {
  return useEntitlementStore((s) => s.premium);
}

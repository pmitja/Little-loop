import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ChildProfile } from '@littleloop/shared';
import { storage } from '@/lib/storage';

interface AppState {
  onboardingComplete: boolean;
  activeChildProfileId: string | null;
  /**
   * Local cache of profiles so the first-run flow works before/without the API
   * (server truth moves to TanStack Query once /child-profiles is live in Phase 0/2).
   */
  childProfiles: ChildProfile[];
  setOnboardingComplete: (done: boolean) => void;
  addChildProfile: (profile: ChildProfile) => void;
  updateChildProfile: (id: string, patch: Partial<ChildProfile>) => void;
  setActiveChildProfileId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      activeChildProfileId: null,
      childProfiles: [],
      setOnboardingComplete: (done) => set({ onboardingComplete: done }),
      addChildProfile: (profile) =>
        set((s) => ({
          childProfiles: [...s.childProfiles, profile],
          activeChildProfileId: profile.id,
        })),
      updateChildProfile: (id, patch) =>
        set((s) => ({
          childProfiles: s.childProfiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      setActiveChildProfileId: (id) => set({ activeChildProfileId: id }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('app');
      },
    },
  ),
);

/**
 * Hydration gate: the splash screen waits until every persisted store has loaded
 * (AsyncStorage fallback is async) before deciding where to route.
 */
const HYDRATION_KEYS = ['app', 'lock', 'playlist', 'timer'] as const;
type HydrationKey = (typeof HYDRATION_KEYS)[number];

interface HydrationState {
  hydrated: Record<HydrationKey, boolean>;
}

export const useHydrationStore = create<HydrationState>(() => ({
  hydrated: { app: false, lock: false, playlist: false, timer: false },
}));

export function markHydrated(key: HydrationKey) {
  useHydrationStore.setState((s) => ({ hydrated: { ...s.hydrated, [key]: true } }));
}

export function useStoresHydrated(): boolean {
  const hydrated = useHydrationStore((s) => s.hydrated);
  return HYDRATION_KEYS.every((k) => hydrated[k]);
}

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
  childRules: Record<string, ChildRules>;
  setOnboardingComplete: (done: boolean) => void;
  addChildProfile: (profile: ChildProfile) => void;
  updateChildProfile: (id: string, patch: Partial<ChildProfile>) => void;
  removeChildProfile: (id: string) => void;
  setActiveChildProfileId: (id: string | null) => void;
  updateChildRules: (id: string, patch: Partial<ChildRules>) => void;
}

export interface ChildRules {
  weekendBonus: boolean;
  bedtimeEnabled: boolean;
  bedtime: string;
  warningEnabled: boolean;
  kidProofExit: boolean;
}

export const DEFAULT_CHILD_RULES: ChildRules = {
  weekendBonus: true,
  bedtimeEnabled: true,
  bedtime: '7:30 PM',
  warningEnabled: true,
  kidProofExit: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      activeChildProfileId: null,
      childProfiles: [],
      childRules: {},
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
      removeChildProfile: (id) =>
        set((s) => {
          const childProfiles = s.childProfiles.filter((p) => p.id !== id);
          const { [id]: _removed, ...childRules } = s.childRules;
          return {
            childProfiles,
            childRules,
            activeChildProfileId:
              s.activeChildProfileId === id
                ? (childProfiles[0]?.id ?? null)
                : s.activeChildProfileId,
          };
        }),
      setActiveChildProfileId: (id) => set({ activeChildProfileId: id }),
      updateChildRules: (id, patch) =>
        set((s) => ({ childRules: { ...s.childRules, [id]: { ...(s.childRules[id] ?? DEFAULT_CHILD_RULES), ...patch } } })),
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

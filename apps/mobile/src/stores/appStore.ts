import { useEffect, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ChildProfile, FamilyRole } from '@littleloop/shared';
import { isPastBedtime } from '@/lib/bedtime';
import { storage } from '@/lib/storage';

interface AppState {
  onboardingComplete: boolean;
  activeChildProfileId: string | null;
  familyRole: FamilyRole | null;
  pendingFamilyInvite: string | null;
  /**
   * Local cache of profiles so the first-run flow works before/without the API
   * (server truth moves to TanStack Query once /child-profiles is live in Phase 0/2).
   */
  childProfiles: ChildProfile[];
  childRules: Record<string, ChildRules>;
  setOnboardingComplete: (done: boolean) => void;
  setFamilyRole: (role: FamilyRole | null) => void;
  setPendingFamilyInvite: (token: string | null) => void;
  /** Replace the local cache with the server's profiles (login / reinstall). */
  setChildProfiles: (profiles: ChildProfile[]) => void;
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

/**
 * Live bedtime gate. Unlike the daily limit — which only moves while a video
 * ticks — bedtime passes on its own, so it needs a clock, not a render.
 */
export function useBedtimeReached(childProfileId: string | null): boolean {
  const rules = useAppStore((s) =>
    childProfileId ? (s.childRules[childProfileId] ?? DEFAULT_CHILD_RULES) : DEFAULT_CHILD_RULES,
  );
  const [reached, setReached] = useState(() => isPastBedtime(rules));

  useEffect(() => {
    const check = () => setReached(isPastBedtime(rules));
    check();
    const id = setInterval(check, 15_000);
    // A device asleep past bedtime doesn't fire timers: re-check on foreground.
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [rules]);

  return childProfileId ? reached : false;
}

/**
 * Hydration gate: the splash screen waits until every persisted store has loaded
 * before deciding where to route.
 *
 * This must be declared *above* useAppStore. MMKV is a synchronous storage, so
 * zustand's persist runs onRehydrateStorage during create() — if the hydration
 * store were declared below, that call would hit it in the temporal dead zone,
 * persist would swallow the ReferenceError, and 'app' would never flip.
 */
const HYDRATION_KEYS = ['app', 'lock', 'playlist', 'timer', 'request'] as const;
type HydrationKey = (typeof HYDRATION_KEYS)[number];

interface HydrationState {
  hydrated: Record<HydrationKey, boolean>;
}

export const useHydrationStore = create<HydrationState>(() => ({
  hydrated: { app: false, lock: false, playlist: false, timer: false, request: false },
}));

export function markHydrated(key: HydrationKey) {
  useHydrationStore.setState((s) => ({ hydrated: { ...s.hydrated, [key]: true } }));
}

export function useStoresHydrated(): boolean {
  const hydrated = useHydrationStore((s) => s.hydrated);
  return HYDRATION_KEYS.every((k) => hydrated[k]);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      activeChildProfileId: null,
      familyRole: null,
      pendingFamilyInvite: null,
      childProfiles: [],
      childRules: {},
      setOnboardingComplete: (done) => set({ onboardingComplete: done }),
      setFamilyRole: (familyRole) => set({ familyRole }),
      setPendingFamilyInvite: (pendingFamilyInvite) => set({ pendingFamilyInvite }),
      setChildProfiles: (childProfiles) =>
        set((s) => ({
          childProfiles,
          childRules: Object.fromEntries(
            childProfiles.map((profile) => [
              profile.id,
              {
                weekendBonus: profile.weekendBonus ?? s.childRules[profile.id]?.weekendBonus ?? DEFAULT_CHILD_RULES.weekendBonus,
                bedtimeEnabled: profile.bedtimeEnabled ?? s.childRules[profile.id]?.bedtimeEnabled ?? DEFAULT_CHILD_RULES.bedtimeEnabled,
                bedtime: profile.bedtime ?? s.childRules[profile.id]?.bedtime ?? DEFAULT_CHILD_RULES.bedtime,
                warningEnabled: profile.warningEnabled ?? s.childRules[profile.id]?.warningEnabled ?? DEFAULT_CHILD_RULES.warningEnabled,
                kidProofExit: profile.kidProofExit ?? s.childRules[profile.id]?.kidProofExit ?? DEFAULT_CHILD_RULES.kidProofExit,
              },
            ]),
          ),
          activeChildProfileId: childProfiles.some((p) => p.id === s.activeChildProfileId)
            ? s.activeChildProfileId
            : (childProfiles[0]?.id ?? null),
        })),
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

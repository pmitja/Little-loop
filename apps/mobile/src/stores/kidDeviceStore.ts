import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';
import { markHydrated } from './appStore';

export interface KidPairing {
  id: string;
  code: string;
  expiresAt: string;
}

interface KidDeviceState {
  /**
   * This install is a child's own device: it only ever runs kid mode for one
   * child and authenticates with a device token, never a parent session.
   */
  paired: boolean;
  deviceId: string | null;
  childProfileId: string | null;
  /** The family dropped Premium and this device is for a second child. */
  premiumBlocked: boolean;
  /** Open pairing session while the setup screen shows its code. */
  pairing: KidPairing | null;
  /**
   * The grown-up chose "this is my child's device" (or a parent unpaired it):
   * launch into the pairing screen instead of parent sign-in.
   */
  setupMode: boolean;
  setSetupMode: (setupMode: boolean) => void;
  setPairing: (pairing: KidPairing | null) => void;
  setPaired: (device: { id: string; childProfileId: string }) => void;
  setChildProfileId: (childProfileId: string) => void;
  setPremiumBlocked: (blocked: boolean) => void;
  reset: () => void;
}

const initial = {
  paired: false,
  deviceId: null,
  childProfileId: null,
  premiumBlocked: false,
  pairing: null,
  setupMode: false,
};

export const useKidDeviceStore = create<KidDeviceState>()(
  persist(
    (set) => ({
      ...initial,
      setSetupMode: (setupMode) => set({ setupMode }),
      setPairing: (pairing) => set({ pairing }),
      setPaired: (device) =>
        set({
          paired: true,
          deviceId: device.id,
          childProfileId: device.childProfileId,
          premiumBlocked: false,
          pairing: null,
          setupMode: false,
        }),
      setChildProfileId: (childProfileId) => set({ childProfileId }),
      setPremiumBlocked: (premiumBlocked) => set({ premiumBlocked }),
      /** Unpaired: back to the pairing screen, never to parent sign-in. */
      reset: () => set({ ...initial, setupMode: true }),
    }),
    {
      name: 'kid-device-store',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => () => {
        markHydrated('kid');
      },
    },
  ),
);

/** Synchronous read for non-React callers (API routing, sync bridges). */
export function isKidDevice(): boolean {
  return useKidDeviceStore.getState().paired;
}

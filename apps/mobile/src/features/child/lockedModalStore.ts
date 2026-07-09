import { create } from 'zustand';

/**
 * Visibility of the s15 LockedModal, rendered once in the (child) layout so any
 * blocked interaction (hardware back, WebView tap-through, padlock) can raise it.
 */
interface LockedModalState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

export const useLockedModalStore = create<LockedModalState>((set) => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));

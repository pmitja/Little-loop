import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence for Zustand stores. MMKV is the target (synchronous, fast), but it is a
 * native module that Expo Go doesn't ship — fall back to AsyncStorage there so the
 * app still runs without a dev build.
 */
function createStorage(): StateStorage {
  try {
    const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = new MMKV({ id: 'littleloop' });
    return {
      getItem: (name) => mmkv.getString(name) ?? null,
      setItem: (name, value) => mmkv.set(name, value),
      removeItem: (name) => mmkv.delete(name),
    };
  } catch {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage');
    const store = AsyncStorage.default;
    return {
      getItem: (name) => store.getItem(name),
      setItem: (name, value) => store.setItem(name, value),
      removeItem: (name) => store.removeItem(name),
    };
  }
}

export const storage = createStorage();

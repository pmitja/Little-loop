import { useCallback, useState } from 'react';
import { useKidDeviceStore } from '@/stores/kidDeviceStore';
import { syncKidStateIfStale } from './kidSync';

/** Repeated pulls within this window cost nothing — a bored kid can't spam the API. */
const PULL_MIN_INTERVAL_MS = 10_000;
/** Keep the spinner up long enough to read as "checked", even on a no-op pull. */
const MIN_SPINNER_MS = 600;

/**
 * Pull-to-refresh for a child's own device: the grown-up approves a video on
 * their phone, pulls down here, and it appears — no push setup, no polling.
 * Returns null on parent devices, where the stores are already fresh.
 */
export function useKidPullToRefresh(): { refreshing: boolean; onRefresh: () => void } | null {
  const kidDevice = useKidDeviceStore((s) => s.paired);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.all([
      syncKidStateIfStale(PULL_MIN_INTERVAL_MS).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS)),
    ]).finally(() => setRefreshing(false));
  }, []);

  return kidDevice ? { refreshing, onRefresh } : null;
}

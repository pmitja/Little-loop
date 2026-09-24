import type { ChildRules } from '@/stores/appStore';
import { formatClockTime, minutesOfDay, parseClockTime } from './clockTime';

/** Videos stay blocked from bedtime until this hour the next morning. */
export const WAKE_HOUR = 6;

/** A cut-off is only meaningful in the afternoon/evening, so the picker clamps here. */
export const BEDTIME_MIN = 12 * 60;
export const BEDTIME_MAX = 23 * 60 + 30;

const DEFAULT_BEDTIME_MINUTES = 19 * 60 + 30;

const clamp = (minutes: number) => Math.min(BEDTIME_MAX, Math.max(BEDTIME_MIN, minutes));

/** '7:30 PM' → minutes since local midnight. */
export function parseBedtime(value: string): number {
  return parseClockTime(value, DEFAULT_BEDTIME_MINUTES);
}

/** Minutes since local midnight → '7:30 PM', clamped to the pickable range. */
export function formatBedtime(minutes: number): string {
  return formatClockTime(clamp(minutes));
}

/**
 * Wall-clock cut-off, independent of how many minutes are left on the daily
 * limit. The window wraps midnight: blocked from bedtime until WAKE_HOUR.
 */
export function isPastBedtime(rules: ChildRules, now: Date = new Date()): boolean {
  if (!rules.bedtimeEnabled) return false;
  const start = clamp(parseBedtime(rules.bedtime));
  const nowMinutes = minutesOfDay(now);
  return nowMinutes >= start || nowMinutes < WAKE_HOUR * 60;
}

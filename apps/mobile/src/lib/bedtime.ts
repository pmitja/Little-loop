import type { ChildRules } from '@/stores/appStore';

/** Videos stay blocked from bedtime until this hour the next morning. */
export const WAKE_HOUR = 6;

/** A cut-off is only meaningful in the afternoon/evening, so the picker clamps here. */
export const BEDTIME_MIN = 12 * 60;
export const BEDTIME_MAX = 23 * 60 + 30;

const DEFAULT_BEDTIME_MINUTES = 19 * 60 + 30;

const clamp = (minutes: number) => Math.min(BEDTIME_MAX, Math.max(BEDTIME_MIN, minutes));

/** '7:30 PM' → minutes since local midnight. */
export function parseBedtime(value: string): number {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return DEFAULT_BEDTIME_MINUTES;
  const hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  return hour * 60 + minute + (match[3] === 'PM' ? 12 * 60 : 0);
}

/** Minutes since local midnight → '7:30 PM', clamped to the pickable range. */
export function formatBedtime(minutes: number): string {
  const clamped = clamp(minutes);
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Wall-clock cut-off, independent of how many minutes are left on the daily
 * limit. The window wraps midnight: blocked from bedtime until WAKE_HOUR.
 */
export function isPastBedtime(rules: ChildRules, now: Date = new Date()): boolean {
  if (!rules.bedtimeEnabled) return false;
  const start = clamp(parseBedtime(rules.bedtime));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= start || nowMinutes < WAKE_HOUR * 60;
}

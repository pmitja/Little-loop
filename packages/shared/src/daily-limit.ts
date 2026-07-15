import { DAILY_LIMIT_MINUTES, DAILY_LIMIT_STEP_MINUTES } from './constants';

/** null → "No limit"; 45 → "45 min"; 60 → "1 hr"; 135 → "2 hr 15 min". */
export function formatDailyLimit(minutes: number | null | undefined): string {
  if (minutes == null) return 'No limit';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Snap a picked duration onto what the profile can actually store: a multiple of
 * the step, inside min..max. The picker composes hours and minutes independently,
 * so it can land past the cap (4 hr + 30 min) — this is what pulls it back.
 */
export function clampDailyLimit(minutes: number): number {
  const stepped = Math.round(minutes / DAILY_LIMIT_STEP_MINUTES) * DAILY_LIMIT_STEP_MINUTES;
  return Math.min(Math.max(stepped, DAILY_LIMIT_MINUTES.min), DAILY_LIMIT_MINUTES.max);
}

/** Hour values offered by the picker: 0 … 4 for a 240-minute cap. */
export function dailyLimitHourOptions(): number[] {
  const maxHours = Math.floor(DAILY_LIMIT_MINUTES.max / 60);
  return Array.from({ length: maxHours + 1 }, (_, i) => i);
}

/** Minute values offered by the picker: 0, 5, … 55. */
export function dailyLimitMinuteOptions(): number[] {
  const count = Math.ceil(60 / DAILY_LIMIT_STEP_MINUTES);
  return Array.from({ length: count }, (_, i) => i * DAILY_LIMIT_STEP_MINUTES);
}

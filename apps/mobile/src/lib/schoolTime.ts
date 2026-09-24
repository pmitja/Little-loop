import type { ChildRules } from '@/stores/appStore';
import { formatClockTime, minutesOfDay, parseClockTime } from './clockTime';

/** The school day can sit anywhere from early morning to early evening. */
export const SCHOOL_MIN = 6 * 60;
export const SCHOOL_MAX = 18 * 60;
/** Parents set the window in quarter hours; it is never shorter than one step. */
export const SCHOOL_STEP = 15;

const DEFAULT_START = 8 * 60;
const DEFAULT_END = 15 * 60;

const clamp = (minutes: number, min: number, max: number) => Math.min(max, Math.max(min, minutes));

/** The window in minutes since midnight, always ordered and inside the pickable range. */
export function schoolWindow(rules: Pick<ChildRules, 'schoolStart' | 'schoolEnd'>): { start: number; end: number } {
  const start = clamp(parseClockTime(rules.schoolStart, DEFAULT_START), SCHOOL_MIN, SCHOOL_MAX - SCHOOL_STEP);
  const end = clamp(parseClockTime(rules.schoolEnd, DEFAULT_END), start + SCHOOL_STEP, SCHOOL_MAX);
  return { start, end };
}

/**
 * Move one edge of the window by `change` minutes, pushing the other edge
 * along when they would cross — so − on the end never lands before the start.
 */
export function shiftSchoolWindow(
  rules: Pick<ChildRules, 'schoolStart' | 'schoolEnd'>,
  edge: 'start' | 'end',
  change: number,
): Pick<ChildRules, 'schoolStart' | 'schoolEnd'> {
  let { start, end } = schoolWindow(rules);
  if (edge === 'start') {
    start = clamp(start + change, SCHOOL_MIN, SCHOOL_MAX - SCHOOL_STEP);
    end = Math.max(end, start + SCHOOL_STEP);
  } else {
    end = clamp(end + change, SCHOOL_MIN + SCHOOL_STEP, SCHOOL_MAX);
    start = Math.min(start, end - SCHOOL_STEP);
  }
  return { schoolStart: formatClockTime(start), schoolEnd: formatClockTime(end) };
}

const isSchoolDay = (now: Date) => now.getDay() >= 1 && now.getDay() <= 5;

/** Weekdays (Mon–Fri) between the start and end: no videos during school hours. */
export function isSchoolTime(rules: ChildRules, now: Date = new Date()): boolean {
  if (!rules.schoolTimeEnabled || !isSchoolDay(now)) return false;
  const { start, end } = schoolWindow(rules);
  const nowMinutes = minutesOfDay(now);
  return nowMinutes >= start && nowMinutes < end;
}

/** '3:00 PM' — when today's school window lets videos back in. */
export function schoolEndLabel(rules: Pick<ChildRules, 'schoolStart' | 'schoolEnd'>): string {
  return formatClockTime(schoolWindow(rules).end);
}

import { describe, expect, it } from 'vitest';
import {
  clampDailyLimit,
  dailyLimitHourOptions,
  dailyLimitMinuteOptions,
  formatDailyLimit,
} from './daily-limit';

describe('formatDailyLimit', () => {
  it.each([
    [null, 'No limit'],
    [undefined, 'No limit'],
    [5, '5 min'],
    [45, '45 min'],
    [60, '1 hr'],
    [135, '2 hr 15 min'],
    [240, '4 hr'],
  ])('%s → %s', (input, expected) => {
    expect(formatDailyLimit(input)).toBe(expected);
  });
});

describe('clampDailyLimit', () => {
  it('holds the stored range at both ends', () => {
    expect(clampDailyLimit(0)).toBe(5);
    expect(clampDailyLimit(600)).toBe(240);
  });

  it('pulls an over-cap hour/minute combination back to the cap', () => {
    expect(clampDailyLimit(4 * 60 + 30)).toBe(240);
  });

  it('snaps to five-minute steps', () => {
    expect(clampDailyLimit(47)).toBe(45);
    expect(clampDailyLimit(48)).toBe(50);
  });
});

describe('picker options', () => {
  it('offers whole hours up to the cap', () => {
    expect(dailyLimitHourOptions()).toEqual([0, 1, 2, 3, 4]);
  });

  it('offers minutes in five-minute steps below an hour', () => {
    const minutes = dailyLimitMinuteOptions();
    expect(minutes[0]).toBe(0);
    expect(minutes.at(-1)).toBe(55);
    expect(minutes).toHaveLength(12);
  });
});

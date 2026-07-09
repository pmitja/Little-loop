import { describe, expect, it } from 'vitest';
import { parseIsoDuration } from './youtube';

describe('parseIsoDuration', () => {
  it('parses typical video durations', () => {
    expect(parseIsoDuration('PT8M24S')).toBe(504);
    expect(parseIsoDuration('PT1H2M30S')).toBe(3750);
    expect(parseIsoDuration('PT45S')).toBe(45);
    expect(parseIsoDuration('PT2M')).toBe(120);
    expect(parseIsoDuration('PT3H')).toBe(10800);
  });

  it('parses day-length durations', () => {
    expect(parseIsoDuration('P1DT2H')).toBe(93600);
  });

  it('rejects nonsense', () => {
    expect(parseIsoDuration('')).toBeNull();
    expect(parseIsoDuration('PT')).toBeNull();
    expect(parseIsoDuration('8:24')).toBeNull();
    expect(parseIsoDuration('P0D')).toBeNull();
  });
});

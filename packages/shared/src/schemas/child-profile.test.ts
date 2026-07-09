import { describe, expect, it } from 'vitest';
import { createChildProfileSchema } from './child-profile';

describe('createChildProfileSchema', () => {
  it('accepts a valid profile', () => {
    const parsed = createChildProfileSchema.parse({
      nickname: 'Emma',
      ageRange: '5-7',
      avatar: 'bear',
      dailyLimitMinutes: 45,
    });
    expect(parsed.nickname).toBe('Emma');
  });

  it('trims and bounds nickname to 1–30 chars', () => {
    expect(() =>
      createChildProfileSchema.parse({ nickname: '   ', ageRange: '5-7', avatar: 'bear' }),
    ).toThrow();
    expect(() =>
      createChildProfileSchema.parse({
        nickname: 'x'.repeat(31),
        ageRange: '5-7',
        avatar: 'bear',
      }),
    ).toThrow();
  });

  it('rejects unknown avatar and out-of-range limits', () => {
    expect(() =>
      createChildProfileSchema.parse({ nickname: 'Emma', ageRange: '5-7', avatar: 'cat' }),
    ).toThrow();
    expect(() =>
      createChildProfileSchema.parse({
        nickname: 'Emma',
        ageRange: '5-7',
        avatar: 'bear',
        dailyLimitMinutes: 3,
      }),
    ).toThrow();
    expect(
      createChildProfileSchema.parse({
        nickname: 'Emma',
        ageRange: '5-7',
        avatar: 'bear',
        dailyLimitMinutes: null,
      }).dailyLimitMinutes,
    ).toBeNull();
  });
});

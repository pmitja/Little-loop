import { describe, expect, it } from 'vitest';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  it('allows up to the limit then throws 429', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5);
    expect(() => rateLimit(key, 5)).toThrowError(HttpError);
    try {
      rateLimit(key, 5);
    } catch (err) {
      expect((err as HttpError).status).toBe(429);
    }
  });

  it('keys are independent', () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(a, 5);
    expect(() => rateLimit(b, 5)).not.toThrow();
  });
});

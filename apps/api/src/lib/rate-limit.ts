import { HttpError } from './http';

/**
 * Fixed-window in-memory rate limiter. Per serverless instance, so this is a
 * soft cap (a burst that fans out across instances slips through) — good
 * enough as abuse damping for v1; swap for Upstash Ratelimit when we need a
 * shared counter.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    // Opportunistic cleanup keeps the map from growing unbounded.
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests — slow down');
  }
}

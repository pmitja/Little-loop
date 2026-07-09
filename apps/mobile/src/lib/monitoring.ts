/**
 * Crash reporting per PLAN Phase 5, with the usual env-flag dev bypass:
 * no EXPO_PUBLIC_SENTRY_DSN (or Expo Go without the native module) → no-op.
 * No PII is attached: no child names, no video titles, no PIN material.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

type Sentry = typeof import('@sentry/react-native');

function loadSentry(): Sentry | null {
  if (!SENTRY_DSN) return null;
  try {
    return require('@sentry/react-native') as Sentry;
  } catch {
    return null;
  }
}

const sentry = loadSentry();
export const monitoringEnabled = sentry !== null;

export function initMonitoring(): void {
  sentry?.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
}

/** Report a handled error worth investigating (network fallbacks are not). */
export function captureError(error: unknown, context?: Record<string, string>): void {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Security events per PLAN §11 (pin_failed, pin_lockout). Recorded as
 * breadcrumbs locally; server sync joins once the API exists.
 */
export function recordSecurityEvent(event: 'pin_failed' | 'pin_lockout'): void {
  sentry?.addBreadcrumb({ category: 'security', message: event, level: 'warning' });
}

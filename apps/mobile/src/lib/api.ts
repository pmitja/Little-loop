/**
 * Authed API client. The better-auth session-cookie getter is injected once
 * from the root layout (hooks can't be used here). All Phase 1 calls degrade
 * gracefully when the API isn't deployed yet — callers decide the offline/local
 * fallback.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type GetCookie = () => string | null;
let getCookie: GetCookie = () => null;

export function setCookieGetter(fn: GetCookie) {
  getCookie = fn;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function apiConfigured(): boolean {
  return BASE_URL.length > 0;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const cookie = getCookie();
  // better-auth validates the session from the Cookie header; the app talks to
  // a separate origin, so the cookie is attached explicitly rather than by the
  // platform cookie jar.
  return apiRequest<T>(path, init, cookie ? { Cookie: cookie } : {});
}

/** Shared transport: JSON in/out, contract-shaped errors → ApiError. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit | undefined,
  authHeaders: Record<string, string>,
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, 'NOT_CONFIGURED', 'EXPO_PUBLIC_API_URL is not set');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

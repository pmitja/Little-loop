/**
 * Authed API client. The Clerk getToken function is injected once from the root
 * layout (hooks can't be used here). All Phase 1 calls degrade gracefully when
 * the API isn't deployed yet — callers decide the offline/local fallback.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type GetToken = () => Promise<string | null>;
let getToken: GetToken = async () => null;

export function setTokenGetter(fn: GetToken) {
  getToken = fn;
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
  if (!BASE_URL) {
    throw new ApiError(0, 'NOT_CONFIGURED', 'EXPO_PUBLIC_API_URL is not set');
  }
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

import { auth } from '@/lib/betterAuth';
import { toNextJsHandler } from 'better-auth/next-js';

// Mounts every better-auth endpoint: /api/auth/sign-in/social,
// /api/auth/callback/google, /api/auth/get-session, /api/auth/sign-out, …
export const { GET, POST } = toNextJsHandler(auth);

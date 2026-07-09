import { json } from '@/lib/http';

export function GET() {
  return json({ ok: true, version: 'v1', time: new Date().toISOString() });
}

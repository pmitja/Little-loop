import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export * from './schema';
export { schema };

export type Db = NeonHttpDatabase<typeof schema>;

let db: Db | null = null;

/**
 * Lazy singleton over Neon's HTTP driver (one fetch per query — the right
 * shape for Vercel serverless). Throws only when first used, so importing
 * this package without DATABASE_URL (tests, codegen) is fine.
 */
export function getDb(): Db {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    db = drizzle(neon(url), { schema });
  }
  return db;
}

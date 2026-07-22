import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { authUser, schema, users, type Db } from '@littleloop/db';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

const MIGRATIONS_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../../packages/db/migrations',
);

/**
 * In-memory Postgres with the real migrations applied — ownership/limit tests
 * run against the actual schema without Neon. `Db` is typed against the Neon
 * HTTP driver; the PGlite driver satisfies the same query surface, hence the
 * one cast here.
 */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
  return drizzle(client, { schema }) as unknown as Db;
}

/**
 * Seed a better-auth identity and its linked app `users` row. `users.authUserId`
 * is a NOT NULL FK to `authUser`, so tests must create the identity first. `id`
 * doubles as the better-auth user id (== RevenueCat app-user-id). Idempotent.
 */
export async function seedUser(db: Db, id: string): Promise<typeof users.$inferSelect> {
  await db
    .insert(authUser)
    .values({ id, email: `${id}@example.com` })
    .onConflictDoNothing();
  const existing = await db.query.users.findFirst({ where: eq(users.authUserId, id) });
  if (existing) return existing;
  const [row] = await db
    .insert(users)
    .values({ authUserId: id, email: `${id}@example.com` })
    .returning();
  return row;
}

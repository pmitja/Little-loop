/**
 * Neon HTTP exposes atomic batch(); the PGlite test driver does not. Keep the
 * production path atomic while allowing the same route to run against the real
 * migration in tests.
 */
export async function runBatch(
  db: object,
  statements: readonly PromiseLike<unknown>[],
): Promise<void> {
  const batch = (db as { batch?: (queries: readonly unknown[]) => Promise<unknown> }).batch;
  if (typeof batch === 'function') {
    await batch.call(db, statements);
    return;
  }
  for (const statement of statements) await statement;
}

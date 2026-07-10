import { requireAuth } from '@/lib/auth';
import { handle, HttpError, json } from '@/lib/http';
import { getOrFetchSearch, normalizeQuery } from '@/lib/search-cache';

/**
 * Search YouTube for parent-curated adds. Tight rate limit: a cache miss costs
 * ~101 quota units (vs 1 for a preview), so search is the whole quota budget.
 */
export const GET = handle(async (req) => {
  const { db } = await requireAuth(req, { limitPerMinute: 10 });

  const query = normalizeQuery(new URL(req.url).searchParams.get('q') ?? '');
  if (query.length < 2 || query.length > 100) {
    throw new HttpError(422, 'INVALID_QUERY', 'Type at least 2 characters to search');
  }

  const results = await getOrFetchSearch(db, query);
  return json({ results });
});

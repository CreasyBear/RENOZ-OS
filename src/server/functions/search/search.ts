/**
 * Search Server Functions
 *
 * Global search and recent items APIs for the application.
 * Uses PostgreSQL FTS with websearch_to_tsquery (fallback to plainto_tsquery on invalid input).
 *
 * - Performant: min query length, skip count for quick search, index-backed search_vector,
 *   single-query pagination with count(*) OVER() for globalSearch
 * - Resilient: tsquery fallback, graceful degradation on unexpected errors
 * - Safe: containsPattern for ILIKE, parameterized queries, schema validation
 * - Intuitive: consistent empty responses, min 2 chars aligned with client
 */

import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { searchIndex, searchIndexOutbox, recentItems } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  searchQuerySchema,
  quickSearchSchema,
  reindexSearchSchema,
  listRecentItemsSchema,
  trackRecentItemSchema,
} from '@/lib/schemas/search';

const MAX_RECENT_ITEMS = 50;
const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_MAX_QUERY_LENGTH = 200;

/** Normalize search query: trim, limit length. Returns empty string if invalid. */
function normalizeSearchQuery(query: string): string {
  return query.trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
}

/** Returns true if query is too short to search (avoids wasteful DB hits). */
function isQueryTooShort(normalized: string): boolean {
  return normalized.length < SEARCH_MIN_QUERY_LENGTH;
}

/** Websearch-style tsquery; falls back to plainto at call site on syntax error. */
function buildTsQuerySql(normalizedQuery: string): SQL {
  return sql`websearch_to_tsquery('english', ${normalizedQuery})`;
}

/** Fallback tsquery when websearch_to_tsquery fails (e.g. special chars). */
function buildPlainTsQuerySql(normalizedQuery: string): SQL {
  return sql`plainto_tsquery('english', ${normalizedQuery})`;
}

function isTsQueryError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /syntax error|tsquery|invalid.*query/i.test(msg);
}

const searchResultColumns = {
  entityType: searchIndex.entityType,
  entityId: searchIndex.entityId,
  title: searchIndex.title,
  subtitle: searchIndex.subtitle,
  description: searchIndex.description,
  url: searchIndex.url,
  rankBoost: searchIndex.rankBoost,
  updatedAt: searchIndex.updatedAt,
} as const;

interface ExecuteSearchParams {
  organizationId: string;
  tsQuery: SQL;
  normalizedQuery: string;
  entityTypes?: readonly string[];
  limit: number;
  offset?: number;
  /** When true, skips the count query (e.g. for quick search). */
  skipCount?: boolean;
}

/** Executes FTS search; used by both globalSearch and quickSearch. */
async function executeSearch(params: ExecuteSearchParams) {
  const { organizationId, tsQuery, normalizedQuery, entityTypes, limit, offset = 0, skipCount } =
    params;
  const ilikePattern = containsPattern(normalizedQuery);

  const conditions = [eq(searchIndex.organizationId, organizationId)];
  conditions.push(
    sql`(
      ${searchIndex.searchVector}
      @@ ${tsQuery}
      OR ${searchIndex.title} ILIKE ${ilikePattern}
      OR ${searchIndex.subtitle} ILIKE ${ilikePattern}
      OR ${searchIndex.description} ILIKE ${ilikePattern}
    )`
  );
  if (entityTypes && entityTypes.length > 0) {
    conditions.push(inArray(searchIndex.entityType, entityTypes));
  }

  const relevanceScore = sql<number>`
    ts_rank(${searchIndex.searchVector}, ${tsQuery}) + ${searchIndex.rankBoost}
  `.as('relevance_score');

  if (skipCount) {
    const results = await db
      .select({ ...searchResultColumns, relevanceScore })
      .from(searchIndex)
      .where(and(...conditions))
      .orderBy(desc(relevanceScore))
      .limit(limit)
      .offset(offset);

    return { results, totalItems: 0 };
  }

  // Single query with window count (avoids second round-trip per Supabase Postgres best practices)
  const rows = await db
    .select({
      ...searchResultColumns,
      relevanceScore,
      totalItems: sql<number>`(count(*) over ())::int`.as('total_items'),
    })
    .from(searchIndex)
    .where(and(...conditions))
    .orderBy(desc(relevanceScore))
    .limit(limit)
    .offset(offset);

  const totalItems = rows[0]?.totalItems ?? 0;
  const results = rows.map(({ totalItems: _t, ...r }) => r);

  return { results, totalItems };
}

interface SearchOptions {
  limit: number;
  offset?: number;
  skipCount?: boolean;
}

/** Run search with websearch tsquery; retry with plainto on tsquery syntax error. */
async function searchWithTsQueryFallback<T>(
  normalizedQuery: string,
  entityTypes: readonly string[] | undefined,
  organizationId: string,
  options: SearchOptions,
  format: (result: Awaited<ReturnType<typeof executeSearch>>) => T,
  emptyResult: T
): Promise<T> {
  const run = (tsQuery: SQL) =>
    executeSearch({
      organizationId,
      tsQuery,
      normalizedQuery,
      entityTypes,
      limit: options.limit,
      offset: options.offset,
      skipCount: options.skipCount,
    });

  try {
    const result = await run(buildTsQuerySql(normalizedQuery));
    return format(result);
  } catch (err) {
    if (isTsQueryError(err)) {
      try {
        const result = await run(buildPlainTsQuerySql(normalizedQuery));
        return format(result);
      } catch {
        return emptyResult;
      }
    }
    throw err;
  }
}

// ============================================================================
// SEARCH
// ============================================================================

const emptyGlobalSearchResult = (data: { page: number; pageSize: number }) => ({
  results: [] as Awaited<ReturnType<typeof executeSearch>>['results'],
  pagination: {
    page: data.page,
    pageSize: data.pageSize,
    totalItems: 0,
    totalPages: 0,
  },
});

export const globalSearch = createServerFn({ method: 'GET' })
  .inputValidator(searchQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const normalizedQuery = normalizeSearchQuery(data.query);

    if (isQueryTooShort(normalizedQuery)) {
      return emptyGlobalSearchResult(data);
    }

    const offset = (data.page - 1) * data.pageSize;

    return searchWithTsQueryFallback(
      normalizedQuery,
      data.entityTypes,
      ctx.organizationId,
      { limit: data.pageSize, offset },
      ({ results, totalItems }) => ({
        results,
        pagination: {
          page: data.page,
          pageSize: data.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / data.pageSize),
        },
      }),
      emptyGlobalSearchResult(data)
    );
  });

const emptyQuickSearchResult = { results: [] as Awaited<ReturnType<typeof executeSearch>>['results'] };

export const quickSearch = createServerFn({ method: 'GET' })
  .inputValidator(quickSearchSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const normalizedQuery = normalizeSearchQuery(data.query);

    if (isQueryTooShort(normalizedQuery)) {
      return emptyQuickSearchResult;
    }

    return searchWithTsQueryFallback(
      normalizedQuery,
      data.entityTypes,
      ctx.organizationId,
      { limit: data.limit, skipCount: true },
      ({ results }) => ({ results }),
      emptyQuickSearchResult
    );
  });

export const indexStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const rows = await db
    .select({
      status: searchIndexOutbox.status,
      count: sql<number>`count(*)::int`,
    })
    .from(searchIndexOutbox)
    .where(eq(searchIndexOutbox.organizationId, ctx.organizationId))
    .groupBy(searchIndexOutbox.status)
    .orderBy(asc(searchIndexOutbox.status));

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.count;
      acc.byStatus[row.status] = row.count;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  );

  return totals;
});

export const reindex = createServerFn({ method: 'POST' })
  .inputValidator(reindexSearchSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(searchIndexOutbox.organizationId, ctx.organizationId)];
    if (data.entityTypes && data.entityTypes.length > 0) {
      conditions.push(inArray(searchIndexOutbox.entityType, data.entityTypes));
    }

    const updated = await db
      .update(searchIndexOutbox)
      .set({
        status: 'pending',
        retryCount: 0,
        lastError: null,
        processedAt: null,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning({ id: searchIndexOutbox.id });

    return { success: true, requeued: updated.length };
  });

// ============================================================================
// RECENT ITEMS
// ============================================================================

export const listRecentItems = createServerFn({ method: 'GET' })
  .inputValidator(listRecentItemsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const items = await db
      .select()
      .from(recentItems)
      .where(
        and(eq(recentItems.organizationId, ctx.organizationId), eq(recentItems.userId, ctx.user.id))
      )
      .orderBy(desc(recentItems.lastAccessedAt))
      .limit(data.limit);

    return { items };
  });

export const trackRecentItem = createServerFn({ method: 'POST' })
  .inputValidator(trackRecentItemSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    await db.transaction(async (tx) => {
      await tx
        .insert(recentItems)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          entityType: data.entityType,
          entityId: data.entityId,
          title: data.title,
          subtitle: data.subtitle ?? null,
          url: data.url ?? null,
          lastAccessedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            recentItems.organizationId,
            recentItems.userId,
            recentItems.entityType,
            recentItems.entityId,
          ],
          set: {
            title: data.title,
            subtitle: data.subtitle ?? null,
            url: data.url ?? null,
            lastAccessedAt: new Date(),
            updatedAt: sql`now()`,
          },
        });

      const keep = await tx
        .select({ id: recentItems.id })
        .from(recentItems)
        .where(
          and(
            eq(recentItems.organizationId, ctx.organizationId),
            eq(recentItems.userId, ctx.user.id)
          )
        )
        .orderBy(desc(recentItems.lastAccessedAt))
        .limit(MAX_RECENT_ITEMS);

      const keepIds = keep.map((row) => row.id);
      if (keepIds.length > 0) {
        await tx
          .delete(recentItems)
          .where(
            and(
              eq(recentItems.organizationId, ctx.organizationId),
              eq(recentItems.userId, ctx.user.id),
              notInArray(recentItems.id, keepIds)
            )
          );
      }
    });

    return { success: true };
  });

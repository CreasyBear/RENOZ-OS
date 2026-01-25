/**
 * Search Server Functions
 *
 * Global search and recent items APIs for the application.
 */

import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
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

// ============================================================================
// SEARCH
// ============================================================================

export const globalSearch = createServerFn({ method: 'GET' })
  .inputValidator(searchQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const tsQuery = sql`websearch_to_tsquery('english', ${data.query})`;
    const conditions = [eq(searchIndex.organizationId, ctx.organizationId)];

    const searchCondition = sql`(
      to_tsvector('english', ${searchIndex.searchText})
      @@ ${tsQuery}
      OR ${searchIndex.title} ILIKE ${'%' + data.query + '%'}
      OR ${searchIndex.subtitle} ILIKE ${'%' + data.query + '%'}
      OR ${searchIndex.description} ILIKE ${'%' + data.query + '%'}
    )`;

    conditions.push(searchCondition);

    if (data.entityTypes && data.entityTypes.length > 0) {
      conditions.push(inArray(searchIndex.entityType, data.entityTypes));
    }

    const relevanceScore = sql<number>`
      ts_rank(
        to_tsvector('english', ${searchIndex.searchText}),
        ${tsQuery}
      ) + ${searchIndex.rankBoost}
    `.as('relevance_score');

    const offset = (data.page - 1) * data.pageSize;

    const results = await db
      .select({
        entityType: searchIndex.entityType,
        entityId: searchIndex.entityId,
        title: searchIndex.title,
        subtitle: searchIndex.subtitle,
        description: searchIndex.description,
        url: searchIndex.url,
        rankBoost: searchIndex.rankBoost,
        updatedAt: searchIndex.updatedAt,
        relevanceScore,
      })
      .from(searchIndex)
      .where(and(...conditions))
      .orderBy(desc(relevanceScore))
      .limit(data.pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchIndex)
      .where(and(...conditions));

    const totalItems = Number(count ?? 0);

    return {
      results,
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / data.pageSize),
      },
    };
  });

export const quickSearch = createServerFn({ method: 'GET' })
  .inputValidator(quickSearchSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const tsQuery = sql`websearch_to_tsquery('english', ${data.query})`;
    const conditions = [eq(searchIndex.organizationId, ctx.organizationId)];

    const searchCondition = sql`(
      to_tsvector('english', ${searchIndex.searchText})
      @@ ${tsQuery}
      OR ${searchIndex.title} ILIKE ${'%' + data.query + '%'}
      OR ${searchIndex.subtitle} ILIKE ${'%' + data.query + '%'}
      OR ${searchIndex.description} ILIKE ${'%' + data.query + '%'}
    )`;

    conditions.push(searchCondition);

    if (data.entityTypes && data.entityTypes.length > 0) {
      conditions.push(inArray(searchIndex.entityType, data.entityTypes));
    }

    const relevanceScore = sql<number>`
      ts_rank(
        to_tsvector('english', ${searchIndex.searchText}),
        ${tsQuery}
      ) + ${searchIndex.rankBoost}
    `.as('relevance_score');

    const results = await db
      .select({
        entityType: searchIndex.entityType,
        entityId: searchIndex.entityId,
        title: searchIndex.title,
        subtitle: searchIndex.subtitle,
        description: searchIndex.description,
        url: searchIndex.url,
        rankBoost: searchIndex.rankBoost,
        updatedAt: searchIndex.updatedAt,
        relevanceScore,
      })
      .from(searchIndex)
      .where(and(...conditions))
      .orderBy(desc(relevanceScore))
      .limit(data.limit);

    return { results };
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

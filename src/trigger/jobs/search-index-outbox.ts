/**
 * Search Index Outbox Processor
 *
 * Periodically processes pending outbox rows and upserts/deletes
 * entries in the search_index table.
 */

import { cronTrigger } from '@trigger.dev/sdk';
import { and, asc, eq, sql } from 'drizzle-orm';
import { client } from '../client';
import { db } from '@/lib/db';
import { searchIndex, searchIndexOutbox } from 'drizzle/schema';

const BATCH_SIZE = 50;

function buildSearchText(payload: Record<string, unknown> | null, fallback: string) {
  const raw =
    (payload?.searchText as string | undefined) ??
    [payload?.title, payload?.subtitle, payload?.description]
      .filter((value) => typeof value === 'string' && value.length > 0)
      .join(' ');

  const normalized = (raw ?? '').trim();
  return normalized.length > 0 ? normalized : fallback;
}

export const processSearchIndexOutboxJob = client.defineJob({
  id: 'process-search-index-outbox',
  name: 'Process Search Index Outbox',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '* * * * *', // Every minute
  }),
  run: async (_payload, io) => {
    await io.logger.info('Checking search index outbox');

    const pendingRows = await db
      .select()
      .from(searchIndexOutbox)
      .where(eq(searchIndexOutbox.status, 'pending'))
      .orderBy(asc(searchIndexOutbox.createdAt))
      .limit(BATCH_SIZE);

    await io.logger.info(`Found ${pendingRows.length} pending outbox rows`);

    if (pendingRows.length === 0) {
      return { processed: 0, completed: 0, failed: 0 };
    }

    let completed = 0;
    let failed = 0;

    for (const row of pendingRows) {
      const taskId = `search-outbox-${row.id}`;
      try {
        await io.runTask(taskId, async () => {
          await db.transaction(async (tx) => {
            await tx
              .update(searchIndexOutbox)
              .set({ status: 'processing', updatedAt: new Date() })
              .where(eq(searchIndexOutbox.id, row.id));

            if (row.action === 'delete') {
              await tx
                .delete(searchIndex)
                .where(
                  and(
                    eq(searchIndex.organizationId, row.organizationId),
                    eq(searchIndex.entityType, row.entityType),
                    eq(searchIndex.entityId, row.entityId)
                  )
                );
            } else {
              const payload = (row.payload ?? {}) as Record<string, unknown>;
              const fallback = `${row.entityType} ${row.entityId}`;
              const searchText = buildSearchText(payload, fallback);

              await tx
                .insert(searchIndex)
                .values({
                  organizationId: row.organizationId,
                  entityType: row.entityType,
                  entityId: row.entityId,
                  title: (payload.title as string | undefined) ?? fallback,
                  subtitle: (payload.subtitle as string | null | undefined) ?? null,
                  description: (payload.description as string | null | undefined) ?? null,
                  url: (payload.url as string | null | undefined) ?? null,
                  searchText,
                  rankBoost: 0,
                  metadata: {},
                })
                .onConflictDoUpdate({
                  target: [
                    searchIndex.organizationId,
                    searchIndex.entityType,
                    searchIndex.entityId,
                  ],
                  set: {
                    title: (payload.title as string | undefined) ?? fallback,
                    subtitle: (payload.subtitle as string | null | undefined) ?? null,
                    description: (payload.description as string | null | undefined) ?? null,
                    url: (payload.url as string | null | undefined) ?? null,
                    searchText,
                    updatedAt: sql`now()`,
                  },
                });
            }

            await tx
              .update(searchIndexOutbox)
              .set({
                status: 'completed',
                processedAt: new Date(),
                lastError: null,
                updatedAt: new Date(),
              })
              .where(eq(searchIndexOutbox.id, row.id));
          });
        });

        completed += 1;
      } catch (error) {
        failed += 1;

        await db
          .update(searchIndexOutbox)
          .set({
            status: 'failed',
            retryCount: sql`${searchIndexOutbox.retryCount} + 1`,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(searchIndexOutbox.id, row.id));
      }
    }

    return {
      processed: pendingRows.length,
      completed,
      failed,
    };
  },
});

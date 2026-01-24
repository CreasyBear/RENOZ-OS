/**
 * Search Index Outbox Helper
 *
 * Enqueue search indexing work in a durable outbox table.
 * Intended to be used inside domain write transactions.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { searchIndexOutbox, type SearchIndexOutboxPayload } from 'drizzle/schema';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SearchIndexOutboxAction = 'upsert' | 'delete';

export interface EnqueueSearchIndexOutboxInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  action: SearchIndexOutboxAction;
  payload?: SearchIndexOutboxPayload;
}

const outboxConflictTarget = [
  searchIndexOutbox.organizationId,
  searchIndexOutbox.entityType,
  searchIndexOutbox.entityId,
  searchIndexOutbox.action,
];

function getOutboxDb(tx?: DbTx) {
  return tx ?? db;
}

export async function enqueueSearchIndexOutbox(input: EnqueueSearchIndexOutboxInput, tx?: DbTx) {
  const target = getOutboxDb(tx);

  return target
    .insert(searchIndexOutbox)
    .values({
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload ?? {},
      status: 'pending',
      retryCount: 0,
      lastError: null,
      processedAt: null,
    })
    .onConflictDoUpdate({
      target: outboxConflictTarget,
      set: {
        payload: sql`excluded.payload`,
        status: 'pending',
        retryCount: 0,
        lastError: null,
        processedAt: null,
        updatedAt: sql`now()`,
      },
    });
}

export async function enqueueSearchIndexOutboxBatch(
  inputs: EnqueueSearchIndexOutboxInput[],
  tx?: DbTx
) {
  if (inputs.length === 0) {
    return;
  }

  const target = getOutboxDb(tx);

  const rows = inputs.map((input) => ({
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    payload: input.payload ?? {},
    status: 'pending',
    retryCount: 0,
    lastError: null,
    processedAt: null,
  }));

  return target
    .insert(searchIndexOutbox)
    .values(rows)
    .onConflictDoUpdate({
      target: outboxConflictTarget,
      set: {
        payload: sql`excluded.payload`,
        status: 'pending',
        retryCount: 0,
        lastError: null,
        processedAt: null,
        updatedAt: sql`now()`,
      },
    });
}

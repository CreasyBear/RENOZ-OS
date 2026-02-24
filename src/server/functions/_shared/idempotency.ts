import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { activities } from 'drizzle/schema';
import type { TransactionExecutor } from '@/lib/db';

type DbExecutor = TransactionExecutor;

export async function hasProcessedIdempotencyKey(
  executor: DbExecutor,
  params: {
    organizationId: string;
    entityType: typeof activities.$inferSelect.entityType;
    entityId: string;
    action: typeof activities.$inferSelect.action;
    idempotencyKey: string;
  }
): Promise<boolean> {
  const [existing] = await executor
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, params.organizationId),
        eq(activities.entityType, params.entityType),
        eq(activities.entityId, params.entityId),
        eq(activities.action, params.action),
        isNotNull(activities.metadata),
        sql`${activities.metadata}->>'idempotencyKey' = ${params.idempotencyKey}`
      )
    )
    .limit(1);

  return !!existing;
}


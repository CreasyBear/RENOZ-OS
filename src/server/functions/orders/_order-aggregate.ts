import { and, eq, sql } from 'drizzle-orm';
import { orders } from 'drizzle/schema';
import type { TransactionExecutor } from '@/lib/db';
import { ConflictError } from '@/lib/server/errors';

type DbExecutor = TransactionExecutor;

export function buildOrderAggregateVersionUpdate(userId: string) {
  return {
    version: sql`${orders.version} + 1`,
    updatedAt: new Date(),
    updatedBy: userId,
  };
}

export async function claimOrderAggregateVersion(
  executor: DbExecutor,
  params: {
    orderId: string;
    organizationId: string;
    expectedVersion: number;
    userId: string;
    errorMessage?: string;
  }
) {
  const [updated] = await executor
    .update(orders)
    .set(buildOrderAggregateVersionUpdate(params.userId))
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId),
        eq(orders.version, params.expectedVersion)
      )
    )
    .returning({ id: orders.id, version: orders.version });

  if (!updated) {
    throw new ConflictError(
      params.errorMessage ?? 'Order was modified by another user. Please refresh and try again.'
    );
  }

  return updated;
}

export async function bumpOrderAggregateVersion(
  executor: DbExecutor,
  params: {
    orderId: string;
    organizationId: string;
    userId: string;
  }
) {
  await executor
    .update(orders)
    .set(buildOrderAggregateVersionUpdate(params.userId))
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId)
      )
    );
}

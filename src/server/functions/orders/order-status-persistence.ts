'use server'

import { and, eq } from 'drizzle-orm';
import type { Database } from '@/lib/db';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import { orders } from 'drizzle/schema';
import { buildOrderAggregateVersionUpdate } from './_order-aggregate';
import { appendStatusNote, buildStatusDates } from './order-status-policy';
import type { OrderStatus } from '@/lib/schemas/orders';

type Order = typeof orders.$inferSelect;
type OrderTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function applyOrderStatusUpdate(
  tx: OrderTransaction,
  params: {
    organizationId: string;
    existing: Order;
    newStatus: OrderStatus;
    userId: string;
    notes?: string;
  }
) {
  const [result] = await tx
    .update(orders)
    .set({
      status: params.newStatus,
      ...buildStatusDates(params.newStatus),
      internalNotes: appendStatusNote(
        params.existing.internalNotes,
        params.newStatus,
        params.notes
      ),
      ...buildOrderAggregateVersionUpdate(params.userId),
    })
    .where(
      and(
        eq(orders.id, params.existing.id),
        eq(orders.organizationId, params.organizationId),
        eq(orders.status, params.existing.status)
      )
    )
    .returning();

  if (!result) {
    return null;
  }

  await enqueueSearchIndexOutbox(
    {
      organizationId: params.organizationId,
      entityType: 'order',
      entityId: result.id,
      action: 'upsert',
      payload: {
        title: result.orderNumber,
        subtitle: result.customerId,
      },
    },
    tx
  );

  return result;
}

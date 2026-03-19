import { and, eq, inArray } from 'drizzle-orm';
import { type TransactionExecutor } from '@/lib/db';
import {
  orderLineItems,
  orderLineSerialAllocations,
  serializedItems,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  releaseSerializedItemAllocation,
} from '@/server/functions/_shared/serialized-lineage';

type DbTransaction = TransactionExecutor;

export async function releaseOrderSerialAllocations(
  tx: DbTransaction,
  params: {
    organizationId: string;
    orderId: string;
    orderNumber: string;
    userId: string;
  }
): Promise<void> {
  const lineItemsWithSerials = await tx
    .select({
      id: orderLineItems.id,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, params.orderId),
        eq(orderLineItems.organizationId, params.organizationId)
      )
    );

  const lineItemIds = lineItemsWithSerials.map((li) => li.id);
  if (lineItemIds.length > 0) {
    await tx
      .update(orderLineItems)
      .set({
        allocatedSerialNumbers: null,
        updatedAt: new Date(),
      })
      .where(inArray(orderLineItems.id, lineItemIds));
  }

  const activeAllocations =
    lineItemIds.length > 0
      ? await tx
          .select({
            lineItemId: orderLineSerialAllocations.orderLineItemId,
            serializedItemId: orderLineSerialAllocations.serializedItemId,
            serialNumber: serializedItems.serialNumberNormalized,
          })
          .from(orderLineSerialAllocations)
          .innerJoin(
            serializedItems,
            eq(orderLineSerialAllocations.serializedItemId, serializedItems.id)
          )
          .where(
            and(
              eq(orderLineSerialAllocations.organizationId, params.organizationId),
              eq(orderLineSerialAllocations.isActive, true),
              inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
            )
          )
      : [];

  for (const allocation of activeAllocations) {
    await releaseSerializedItemAllocation(tx, {
      organizationId: params.organizationId,
      serializedItemId: allocation.serializedItemId,
      userId: params.userId,
    });
    await addSerializedItemEvent(tx, {
      organizationId: params.organizationId,
      serializedItemId: allocation.serializedItemId,
      eventType: 'deallocated',
      entityType: 'order_line_item',
      entityId: allocation.lineItemId,
      notes: `Order ${params.orderNumber} cancelled`,
      userId: params.userId,
    });
  }
}

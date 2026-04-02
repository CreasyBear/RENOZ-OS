'use server'

import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db';
import type { OrderStatus } from '@/lib/schemas/orders';
import { orders, orderLineItems } from 'drizzle/schema';
import { buildOrderAggregateVersionUpdate } from './_order-aggregate';

type OrderTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

interface FulfillmentTotals {
  totalOrdered: number;
  totalShipped: number;
  totalDelivered: number;
}

function determineOrderFulfillmentStatus(
  totals: FulfillmentTotals
): OrderStatus | null {
  if (totals.totalOrdered <= 0) {
    return null;
  }

  if (totals.totalDelivered >= totals.totalOrdered) {
    return 'delivered';
  }

  if (totals.totalShipped >= totals.totalOrdered) {
    return 'shipped';
  }

  if (totals.totalShipped > 0) {
    return 'partially_shipped';
  }

  return null;
}

function toOrderDateString(value: string | Date | null | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
}

export async function recomputeOrderFulfillmentStatus(
  tx: OrderTransaction,
  params: {
    organizationId: string;
    orderId: string;
    userId: string;
    shippedAt?: Date;
    deliveredAt?: Date;
  }
) {
  const [currentOrder] = await tx
    .select({
      id: orders.id,
      organizationId: orders.organizationId,
      status: orders.status,
      shippedDate: orders.shippedDate,
      deliveredDate: orders.deliveredDate,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!currentOrder) {
    return null;
  }

  const [totals] = await tx
    .select({
      totalOrdered: sql<number>`coalesce(sum(${orderLineItems.quantity}), 0)::int`,
      totalShipped: sql<number>`coalesce(sum(${orderLineItems.qtyShipped}), 0)::int`,
      totalDelivered: sql<number>`coalesce(sum(${orderLineItems.qtyDelivered}), 0)::int`,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, params.orderId),
        eq(orderLineItems.organizationId, params.organizationId)
      )
    );

  const nextStatus = determineOrderFulfillmentStatus({
    totalOrdered: Number(totals?.totalOrdered ?? 0),
    totalShipped: Number(totals?.totalShipped ?? 0),
    totalDelivered: Number(totals?.totalDelivered ?? 0),
  });

  if (!nextStatus) {
    return currentOrder;
  }

  const nextShippedDate =
    nextStatus === 'shipped' || nextStatus === 'partially_shipped'
      ? toOrderDateString(currentOrder.shippedDate) ??
        toOrderDateString(params.shippedAt) ??
        toOrderDateString(new Date())
      : currentOrder.shippedDate;
  const nextDeliveredDate =
    nextStatus === 'delivered'
      ? toOrderDateString(currentOrder.deliveredDate) ??
        toOrderDateString(params.deliveredAt) ??
        toOrderDateString(new Date())
      : currentOrder.deliveredDate;

  const needsUpdate =
    currentOrder.status !== nextStatus ||
    String(currentOrder.shippedDate ?? '') !== String(nextShippedDate ?? '') ||
    String(currentOrder.deliveredDate ?? '') !== String(nextDeliveredDate ?? '');

  if (!needsUpdate) {
    return currentOrder;
  }

  const [updatedOrder] = await tx
    .update(orders)
    .set({
      status: nextStatus,
      shippedDate: nextShippedDate,
      deliveredDate: nextDeliveredDate,
      ...buildOrderAggregateVersionUpdate(params.userId),
    })
    .where(
      and(
        eq(orders.id, params.orderId),
        eq(orders.organizationId, params.organizationId)
      )
    )
    .returning({
      id: orders.id,
      organizationId: orders.organizationId,
      status: orders.status,
      shippedDate: orders.shippedDate,
      deliveredDate: orders.deliveredDate,
    });

  return updatedOrder ?? currentOrder;
}

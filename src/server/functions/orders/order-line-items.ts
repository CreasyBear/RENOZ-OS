'use server'

import { and, eq, isNull, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { db, type TransactionExecutor } from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import {
  addOrderLineItemInputSchema,
  updateOrderLineItemInputSchema,
  deleteOrderLineItemInputSchema,
} from '@/lib/schemas/orders';
import { orderLineItems, orders } from 'drizzle/schema';
import { claimOrderAggregateVersion } from './_order-aggregate';
import { calculateLineItemTotals, calculateOrderTotals } from './order-pricing';

type DbOrTransaction = TransactionExecutor;
type OrderLineItem = typeof orderLineItems.$inferSelect;

export async function recalculateOrderTotals(
  orderId: string,
  userId: string,
  organizationId: string,
  tx: DbOrTransaction = db
): Promise<void> {
  const [lineItemAgg] = await tx
    .select({
      totalLineTotal: sql<number>`COALESCE(SUM(${orderLineItems.lineTotal}), 0)`,
      totalTaxAmount: sql<number>`COALESCE(SUM(${orderLineItems.taxAmount}), 0)`,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, orderId),
        eq(orderLineItems.organizationId, organizationId)
      )
    );

  const [order] = await tx
    .select({
      discountPercent: orders.discountPercent,
      discountAmount: orders.discountAmount,
      shippingAmount: orders.shippingAmount,
      paidAmount: orders.paidAmount,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organizationId, organizationId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (!order) {
    return;
  }

  const lineSubtotal = Number(lineItemAgg?.totalLineTotal ?? 0);
  const lineTaxTotal = Number(lineItemAgg?.totalTaxAmount ?? 0);

  const totals = calculateOrderTotals(
    [{ lineTotal: lineSubtotal, taxAmount: lineTaxTotal }],
    order.discountPercent ? Number(order.discountPercent) : null,
    order.discountAmount ? Number(order.discountAmount) : null,
    Number(order.shippingAmount)
  );

  const balanceDue = totals.total - Number(order.paidAmount);

  await tx
    .update(orders)
    .set({
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      balanceDue,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)));
}

export const addOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(addOrderLineItemInputSchema)
  .handler(async ({ data }): Promise<OrderLineItem> => {
    const ctx = await withAuth();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    if (order.version !== data.expectedOrderVersion) {
      throw new ConflictError('Order was modified by another user. Please refresh and try again.');
    }

    const totals = calculateLineItemTotals({
      quantity: Number(data.item.quantity),
      unitPrice: Number(data.item.unitPrice),
      discountPercent: data.item.discountPercent ? Number(data.item.discountPercent) : null,
      discountAmount: data.item.discountAmount ? Number(data.item.discountAmount) : null,
      taxType: data.item.taxType,
    });

    const newItem = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      await claimOrderAggregateVersion(tx, {
        orderId: data.orderId,
        organizationId: ctx.organizationId,
        expectedVersion: data.expectedOrderVersion,
        userId: ctx.user.id,
      });

      const [maxLine] = await tx
        .select({ max: sql<string>`MAX(${orderLineItems.lineNumber})` })
        .from(orderLineItems)
        .where(
          and(
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      const nextLineNumber = ((parseInt(maxLine?.max ?? '0', 10) || 0) + 1)
        .toString()
        .padStart(3, '0');

      const [inserted] = await tx
        .insert(orderLineItems)
        .values({
          organizationId: ctx.organizationId,
          orderId: data.orderId,
          productId: data.item.productId,
          lineNumber: data.item.lineNumber || nextLineNumber,
          sku: data.item.sku,
          description: data.item.description,
          quantity: data.item.quantity,
          unitPrice: data.item.unitPrice,
          discountPercent: data.item.discountPercent,
          discountAmount: data.item.discountAmount ?? 0,
          taxType: data.item.taxType ?? 'gst',
          taxAmount: totals.taxAmount,
          lineTotal: totals.lineTotal,
          qtyPicked: 0,
          qtyShipped: 0,
          qtyDelivered: 0,
          notes: data.item.notes,
        })
        .returning();

      await recalculateOrderTotals(data.orderId, ctx.user.id, ctx.organizationId, tx);

      return inserted;
    });

    return newItem;
  });

export const updateOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(updateOrderLineItemInputSchema)
  .handler(async ({ data: { orderId, itemId, expectedOrderVersion, data } }): Promise<OrderLineItem> => {
    const ctx = await withAuth();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    if (order.version !== expectedOrderVersion) {
      throw new ConflictError('Order was modified by another user. Please refresh and try again.');
    }

    const [existing] = await db
      .select({
        id: orderLineItems.id,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        discountPercent: orderLineItems.discountPercent,
        discountAmount: orderLineItems.discountAmount,
        taxType: orderLineItems.taxType,
      })
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.id, itemId),
          eq(orderLineItems.orderId, orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Line item not found', 'orderLineItem');
    }

    const quantity = data.quantity ?? Number(existing.quantity);
    const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
    const discountPercent =
      data.discountPercent ?? (existing.discountPercent ? Number(existing.discountPercent) : null);
    const discountAmount = data.discountAmount ?? Number(existing.discountAmount);
    const taxType = data.taxType ?? existing.taxType;

    const totals = calculateLineItemTotals({
      quantity,
      unitPrice,
      discountPercent,
      discountAmount,
      taxType,
    });

    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      await claimOrderAggregateVersion(tx, {
        orderId,
        organizationId: ctx.organizationId,
        expectedVersion: expectedOrderVersion,
        userId: ctx.user.id,
      });

      const [updatedItem] = await tx
        .update(orderLineItems)
        .set({
          ...data,
          quantity,
          unitPrice,
          discountPercent,
          discountAmount,
          taxAmount: totals.taxAmount,
          lineTotal: totals.lineTotal,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orderLineItems.id, itemId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        )
        .returning();

      await recalculateOrderTotals(orderId, ctx.user.id, ctx.organizationId, tx);

      return updatedItem;
    });

    return updated;
  });

export const deleteOrderLineItem = createServerFn({ method: 'POST' })
  .inputValidator(deleteOrderLineItemInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (order.status !== 'draft') {
      throw new ValidationError('Order is not editable', {
        status: ['Only draft orders can be modified'],
      });
    }

    if (order.version !== data.expectedOrderVersion) {
      throw new ConflictError('Order was modified by another user. Please refresh and try again.');
    }

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      await claimOrderAggregateVersion(tx, {
        orderId: data.orderId,
        organizationId: ctx.organizationId,
        expectedVersion: data.expectedOrderVersion,
        userId: ctx.user.id,
      });

      const [countResult] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(orderLineItems)
        .where(
          and(
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      if ((countResult?.count ?? 0) <= 1) {
        throw new ValidationError('Cannot delete last line item', {
          lineItem: ['Order must have at least one line item'],
        });
      }

      await tx
        .delete(orderLineItems)
        .where(
          and(
            eq(orderLineItems.id, data.itemId),
            eq(orderLineItems.orderId, data.orderId),
            eq(orderLineItems.organizationId, ctx.organizationId)
          )
        );

      await recalculateOrderTotals(data.orderId, ctx.user.id, ctx.organizationId, tx);
    });

    return { success: true };
  });

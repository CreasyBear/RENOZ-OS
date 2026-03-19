'use server'

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/lib/db';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import {
  customers,
  orderLineItems,
  orders,
  type OrderAddress,
  type OrderMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';
import {
  createOrderSchema,
  orderParamsSchema,
  type OrderStatus,
  updateOrderSchema,
} from '@/lib/schemas/orders';
import { validateInvoiceTotals } from '@/lib/utils/financial';
import { ordersLogger } from '@/lib/logger';
import {
  buildOrderAggregateVersionUpdate,
} from './_order-aggregate';
import {
  getOrderByClientRequestId,
} from './order-read';
import type { OrderWithLineItems } from './order-read';
import { generateOrderNumber } from './order-numbering';
import { calculateLineItemTotals, calculateOrderTotals } from './order-pricing';
import { releaseOrderSerialAllocations } from './order-serial-side-effects';
import { generateQuotePdf } from '@/trigger/jobs';
import { validateStatusTransition } from './order-status-policy';

const ORDER_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'version',
];

type Order = typeof orders.$inferSelect;

export const createOrder = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);
    const clientRequestId = data.clientRequestId.trim();

    if (clientRequestId.length < 8) {
      throw new ValidationError('Client request ID is invalid', {
        clientRequestId: ['Client request ID is required'],
      });
    }

    const replayedOrder = await getOrderByClientRequestId(ctx.organizationId, clientRequestId);
    if (replayedOrder) {
      return replayedOrder;
    }

    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      throw new ValidationError('Customer not found', {
        customerId: ['Customer does not exist or is not accessible'],
      });
    }

    const orderNumber = data.orderNumber || (await generateOrderNumber(ctx.organizationId));

    const [existingOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, ctx.organizationId),
          eq(orders.orderNumber, orderNumber),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (existingOrder) {
      throw new ConflictError('Order number already exists');
    }

    const lineItemsWithTotals = data.lineItems.map((item, index) => {
      const totals = calculateLineItemTotals({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
        discountAmount: item.discountAmount ? Number(item.discountAmount) : null,
        taxType: item.taxType,
      });
      return {
        ...item,
        lineNumber: item.lineNumber || (index + 1).toString().padStart(3, '0'),
        ...totals,
      };
    });

    const orderTotals = calculateOrderTotals(
      lineItemsWithTotals,
      data.discountPercent ? Number(data.discountPercent) : null,
      data.discountAmount ? Number(data.discountAmount) : null,
      data.shippingAmount ? Number(data.shippingAmount) : 0
    );

    const totalsValidation = validateInvoiceTotals({
      subtotal: orderTotals.subtotal,
      taxAmount: orderTotals.taxAmount,
      shippingAmount: data.shippingAmount ? Number(data.shippingAmount) : 0,
      discountAmount: orderTotals.discountAmount,
      total: orderTotals.total,
    });

    if (!totalsValidation.isValid) {
      throw new ValidationError('Order totals do not reconcile', {
        total: [
          `Expected ${totalsValidation.expectedTotal.toFixed(2)}, got ${orderTotals.total.toFixed(2)}`,
        ],
      });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [newOrder] = await tx
        .insert(orders)
        .values({
          organizationId: ctx.organizationId,
          customerId: data.customerId,
          orderNumber,
          status: data.status ?? 'draft',
          paymentStatus: data.paymentStatus ?? 'pending',
          orderDate: data.orderDate ?? new Date().toISOString().slice(0, 10),
          dueDate: data.dueDate ?? undefined,
          billingAddress: data.billingAddress as OrderAddress | undefined,
          shippingAddress: data.shippingAddress as OrderAddress | undefined,
          subtotal: orderTotals.subtotal,
          discountAmount: orderTotals.discountAmount,
          discountPercent: data.discountPercent ? Number(data.discountPercent) : undefined,
          taxAmount: orderTotals.taxAmount,
          shippingAmount: data.shippingAmount ?? 0,
          total: orderTotals.total,
          paidAmount: 0,
          balanceDue: orderTotals.total,
          metadata: data.metadata as OrderMetadata | undefined,
          clientRequestId,
          internalNotes: data.internalNotes,
          customerNotes: data.customerNotes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      const newLineItems = await tx
        .insert(orderLineItems)
        .values(
          lineItemsWithTotals.map((item) => ({
            organizationId: ctx.organizationId,
            orderId: newOrder.id,
            productId: item.productId,
            lineNumber: item.lineNumber,
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount ?? 0,
            taxType: item.taxType ?? 'gst',
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
            qtyPicked: 0,
            qtyShipped: 0,
            qtyDelivered: 0,
            notes: item.notes,
          }))
        )
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: newOrder.id,
          action: 'upsert',
          payload: {
            title: newOrder.orderNumber,
            subtitle: newOrder.customerId,
          },
        },
        tx
      );

      return {
        order: newOrder,
        lineItems: newLineItems,
      };
    }).catch(async (error: unknown) => {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        const existing = await getOrderByClientRequestId(ctx.organizationId, clientRequestId);
        if (existing) {
          return {
            order: { ...existing, lineItems: undefined } as Order,
            lineItems: existing.lineItems,
          };
        }
      }

      throw error;
    });

    generateQuotePdf.trigger({
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      organizationId: ctx.organizationId,
      customerId: result.order.customerId,
    }).catch((error) => {
      ordersLogger.error('[INT-DOC-007] Failed to trigger quote PDF generation', error);
    });

    logger.logAsync({
      entityType: 'order',
      entityId: result.order.id,
      action: 'created',
      changes: computeChanges({
        before: null,
        after: result.order,
        excludeFields: ORDER_EXCLUDED_FIELDS as never[],
      }),
      description: `Created order: ${result.order.orderNumber}`,
      metadata: {
        orderNumber: result.order.orderNumber,
        customerId: result.order.customerId,
        total: result.order.total,
        status: result.order.status,
        lineItemCount: result.lineItems.length,
      },
    });

    return {
      ...result.order,
      lineItems: result.lineItems,
    };
  });

export const updateOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateOrderSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<Order> => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);
    const { expectedVersion, ...input } = data;

    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    const before = existing;
    const currentStatus = existing.status as OrderStatus;
    const requestedStatus = input.status as OrderStatus | undefined;

    if (existing.version !== expectedVersion) {
      throw new ConflictError('Order was modified by another user. Please refresh and try again.');
    }

    if (input.customerId && input.customerId !== existing.customerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        throw new ValidationError('Customer not found', {
          customerId: ['Customer does not exist'],
        });
      }
    }

    if (input.orderNumber && input.orderNumber !== existing.orderNumber) {
      const [duplicate] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.orderNumber, input.orderNumber),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictError('Order number already exists');
      }
    }

    if (requestedStatus && requestedStatus !== currentStatus) {
      if (!validateStatusTransition(currentStatus, requestedStatus)) {
        throw new ValidationError('Invalid status transition', {
          status: [`Cannot transition from '${currentStatus}' to '${requestedStatus}'`],
        });
      }

      if (requestedStatus === 'cancelled') {
        const [shippedLineItem] = await db
          .select({ id: orderLineItems.id })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.orderId, id),
              eq(orderLineItems.organizationId, ctx.organizationId),
              sql`${orderLineItems.qtyShipped} > 0`
            )
          )
          .limit(1);

        if (shippedLineItem) {
          throw new ValidationError('Cannot cancel order with shipped items', {
            status: ['This order has shipped quantities. Create returns/RMA before cancellation.'],
          });
        }
      }
    }

    const updateData: Record<string, unknown> = { ...input };
    if (requestedStatus && requestedStatus === currentStatus) {
      delete updateData.status;
    }
    if (requestedStatus && requestedStatus !== currentStatus) {
      if (requestedStatus === 'shipped' || requestedStatus === 'partially_shipped') {
        updateData.shippedDate = new Date().toISOString().slice(0, 10);
      }
      if (requestedStatus === 'delivered') {
        updateData.deliveredDate = new Date().toISOString().slice(0, 10);
      }
    }
    if (input.billingAddress) {
      updateData.billingAddress = input.billingAddress as OrderAddress;
    }
    if (input.shippingAddress) {
      updateData.shippingAddress = input.shippingAddress as OrderAddress;
    }
    if (input.metadata) {
      updateData.metadata = input.metadata as OrderMetadata;
    }
    Object.assign(updateData, buildOrderAggregateVersionUpdate(ctx.user.id));

    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (requestedStatus === 'cancelled' && requestedStatus !== currentStatus) {
        await releaseOrderSerialAllocations(tx, {
          organizationId: ctx.organizationId,
          orderId: id,
          orderNumber: existing.orderNumber,
          userId: ctx.user.id,
        });
      }

      const [result] = await tx
        .update(orders)
        .set(updateData)
        .where(
          and(
            eq(orders.id, id),
            eq(orders.organizationId, ctx.organizationId),
            eq(orders.version, expectedVersion),
            requestedStatus && requestedStatus !== currentStatus
              ? eq(orders.status, currentStatus)
              : undefined,
            isNull(orders.deletedAt)
          )
        )
        .returning();

      if (!result) {
        throw new ConflictError(
          'Order was modified by another user. Please refresh and try again.'
        );
      }

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
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
    });

    const changes = computeChanges({
      before,
      after: updated,
      excludeFields: ORDER_EXCLUDED_FIELDS as never[],
    });

    if (changes.fields && changes.fields.length > 0) {
      logger.logAsync({
        entityType: 'order',
        entityId: updated.id,
        action: 'updated',
        changes,
        description: `Updated order: ${updated.orderNumber}`,
        metadata: {
          orderNumber: updated.orderNumber,
          customerId: updated.customerId,
          changedFields: changes.fields,
        },
      });
    }

    return updated;
  });

export const deleteOrder = createServerFn({ method: 'POST' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

    const [existing] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    if (existing.status !== 'draft') {
      throw new ValidationError('Cannot delete non-draft order', {
        status: ['Only draft orders can be deleted'],
      });
    }

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      await tx
        .update(orders)
        .set({
          deletedAt: new Date(),
          ...buildOrderAggregateVersionUpdate(ctx.user.id),
        })
        .where(and(eq(orders.id, data.id), eq(orders.organizationId, ctx.organizationId)));

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: data.id,
          action: 'delete',
        },
        tx
      );
    });

    logger.logAsync({
      entityType: 'order',
      entityId: data.id,
      action: 'deleted',
      description: `Deleted order: ${existing.orderNumber}`,
      metadata: {
        orderNumber: existing.orderNumber,
        status: existing.status,
        total: existing.total,
      },
    });

    return { success: true };
  });

export const duplicateOrder = createServerFn({ method: 'POST' })
  .inputValidator(orderParamsSchema)
  .handler(async ({ data }): Promise<OrderWithLineItems> => {
    const ctx = await withAuth();

    const [sourceOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!sourceOrder) {
      throw new NotFoundError('Order not found', 'order');
    }

    const sourceLineItems = await db
      .select()
      .from(orderLineItems)
      .where(
        and(
          eq(orderLineItems.orderId, data.id),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(orderLineItems.lineNumber));

    const newOrderNumber = await generateOrderNumber(ctx.organizationId);

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [newOrder] = await tx
        .insert(orders)
        .values({
          organizationId: ctx.organizationId,
          customerId: sourceOrder.customerId,
          orderNumber: newOrderNumber,
          status: 'draft',
          paymentStatus: 'pending',
          orderDate: new Date().toISOString().slice(0, 10),
          dueDate: null,
          billingAddress: sourceOrder.billingAddress,
          shippingAddress: sourceOrder.shippingAddress,
          subtotal: Number(sourceOrder.subtotal),
          discountAmount: Number(sourceOrder.discountAmount),
          discountPercent: sourceOrder.discountPercent ? Number(sourceOrder.discountPercent) : null,
          taxAmount: Number(sourceOrder.taxAmount),
          shippingAmount: Number(sourceOrder.shippingAmount),
          total: Number(sourceOrder.total),
          paidAmount: 0,
          balanceDue: Number(sourceOrder.total),
          metadata: {
            ...((sourceOrder.metadata as object) ?? {}),
            duplicatedFrom: data.id,
          },
          internalNotes: `Duplicated from order ${sourceOrder.orderNumber}`,
          customerNotes: sourceOrder.customerNotes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      const newLineItems = await tx
        .insert(orderLineItems)
        .values(
          sourceLineItems.map((item) => ({
            organizationId: ctx.organizationId,
            orderId: newOrder.id,
            productId: item.productId,
            lineNumber: item.lineNumber,
            sku: item.sku,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
            discountAmount: Number(item.discountAmount),
            taxType: item.taxType,
            taxAmount: Number(item.taxAmount),
            lineTotal: Number(item.lineTotal),
            qtyPicked: 0,
            qtyShipped: 0,
            qtyDelivered: 0,
            notes: item.notes,
          }))
        )
        .returning();

      await enqueueSearchIndexOutbox(
        {
          organizationId: ctx.organizationId,
          entityType: 'order',
          entityId: newOrder.id,
          action: 'upsert',
          payload: {
            title: newOrder.orderNumber,
            subtitle: newOrder.customerId,
          },
        },
        tx
      );

      return {
        order: newOrder,
        lineItems: newLineItems,
      };
    });

    return {
      ...result.order,
      lineItems: result.lineItems,
    };
  });

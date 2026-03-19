'use server'

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, orderLineItems } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
  type SerializedMutationEnvelope,
} from '@/lib/server/serialized-mutation-contract';
import {
  updateOrderStatusSchema,
  type OrderStatus,
} from '@/lib/schemas/orders';
import type { SerializedMutationErrorCode } from '@/lib/schemas/inventory';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import { releaseOrderSerialAllocations } from './order-serial-side-effects';
import { queueStatusArtifacts } from './order-status-effects';
import { applyOrderStatusUpdate } from './order-status-persistence';
import { logOrderStatusChange } from './order-status-activity';
import { validateStatusTransition } from './order-status-policy';

export { validateStatusTransition } from './order-status-policy';

type Order = typeof orders.$inferSelect;

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateOrderStatusSchema,
    })
  )
  .handler(async ({ data: { id, data } }): Promise<SerializedMutationEnvelope<Order>> => {
    const ctx = await withAuth();
    const logger = createActivityLoggerWithContext(ctx);

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

    const currentStatus = existing.status as OrderStatus;
    const newStatus = data.status as OrderStatus;
    const transitionName = 'order_status_update';
    const idempotencyKey = data.idempotencyKey?.trim();

    if (idempotencyKey) {
      const replayed = await hasProcessedIdempotencyKey(db, {
        organizationId: ctx.organizationId,
        entityType: 'order',
        entityId: id,
        action: 'updated',
        idempotencyKey,
      });
      if (replayed) {
        return serializedMutationSuccess(
          existing,
          `Idempotent replay ignored. Order remains in ${currentStatus} status.`,
          {
            affectedIds: [existing.id],
            transition: {
              transition: transitionName,
              fromStatus: currentStatus,
              toStatus: currentStatus,
              blockedBy: 'idempotency_key_replay',
            },
          }
        );
      }
    }

    if (currentStatus === newStatus) {
      return serializedMutationSuccess(existing, `Order already in ${newStatus} status.`, {
        affectedIds: [existing.id],
        transition: {
          transition: transitionName,
          fromStatus: currentStatus,
          toStatus: newStatus,
        },
      });
    }

    if (newStatus === 'cancelled') {
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
        throw createSerializedMutationError(
          'Cannot cancel order with shipped items. Create returns/RMA before cancellation.',
          'shipped_status_conflict'
        );
      }
    }

    if (!validateStatusTransition(currentStatus, newStatus)) {
      throw createSerializedMutationError(
        `Invalid status transition: cannot move from '${currentStatus}' to '${newStatus}'.`,
        'transition_blocked'
      );
    }

    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      if (newStatus === 'cancelled') {
        await releaseOrderSerialAllocations(tx, {
          organizationId: ctx.organizationId,
          orderId: id,
          orderNumber: existing.orderNumber,
          userId: ctx.user.id,
        });
      }

      const result = await applyOrderStatusUpdate(tx, {
        organizationId: ctx.organizationId,
        existing,
        newStatus,
        userId: ctx.user.id,
        notes: data.notes,
      });

      if (!result) {
        throw new ConflictError(
          'Order status was modified by another user. Please refresh and try again.'
        );
      }

      return result;
    });

    await queueStatusArtifacts(ctx.organizationId, [updated]);

    logOrderStatusChange(logger, updated, {
      previousStatus: currentStatus,
      newStatus,
      notes: data.notes,
      idempotencyKey: data.idempotencyKey,
    });

    return serializedMutationSuccess(updated, `Order status updated to ${newStatus}.`, {
      affectedIds: [updated.id],
      transition: {
        transition: transitionName,
        fromStatus: currentStatus,
        toStatus: newStatus,
      },
    });
  });

export const bulkUpdateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      orderIds: z.array(z.string().uuid()),
      status: updateOrderStatusSchema.shape.status,
      notes: z.string().optional(),
    })
  )
  .handler(
    async ({
      data: { orderIds, status, notes },
    }): Promise<{
      updated: number;
      failed: string[];
      success: true;
      message: string;
      affectedIds?: string[];
      errorsById?: Record<string, string>;
      partialFailure?: { code: SerializedMutationErrorCode; message: string };
    }> => {
      const ctx = await withAuth();
      const logger = createActivityLoggerWithContext(ctx);

      if (orderIds.length === 0) {
        throw new ValidationError('No order IDs provided', {
          orderIds: ['At least one order ID is required'],
        });
      }

      const updated: Order[] = [];
      const changedOrders: Order[] = [];
      const failed: string[] = [];

      const existingOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            inArray(orders.id, orderIds),
            eq(orders.organizationId, ctx.organizationId),
            isNull(orders.deletedAt)
          )
        );

      const orderMap = new Map(existingOrders.map((order) => [order.id, order]));
      const validUpdates: Order[] = [];
      const newStatus = status as OrderStatus;

      for (const orderId of orderIds) {
        const existing = orderMap.get(orderId);

        if (!existing) {
          failed.push(`${orderId}: Order not found`);
          continue;
        }

        const currentStatus = existing.status as OrderStatus;
        if (currentStatus === newStatus) {
          updated.push(existing);
          continue;
        }

        if (!validateStatusTransition(currentStatus, newStatus)) {
          failed.push(
            `${orderId}: Invalid status transition from '${currentStatus}' to '${newStatus}'`
          );
          continue;
        }

        validUpdates.push(existing);
      }

      if (newStatus === 'cancelled' && validUpdates.length > 0) {
        const candidateOrderIds = validUpdates.map((order) => order.id);
        const shippedRows = await db
          .select({ orderId: orderLineItems.orderId })
          .from(orderLineItems)
          .where(
            and(
              eq(orderLineItems.organizationId, ctx.organizationId),
              inArray(orderLineItems.orderId, candidateOrderIds),
              sql`${orderLineItems.qtyShipped} > 0`
            )
          )
          .groupBy(orderLineItems.orderId);

        const blocked = new Set(shippedRows.map((row) => row.orderId));
        if (blocked.size > 0) {
          for (const orderId of blocked) {
            failed.push(
              `${orderId}: Cannot cancel order with shipped quantities (process return/RMA first)`
            );
          }
          const filtered = validUpdates.filter((order) => !blocked.has(order.id));
          validUpdates.length = 0;
          validUpdates.push(...filtered);
        }
      }

      if (validUpdates.length > 0) {
        const committedUpdates = await db.transaction(async (tx) => {
          await tx.execute(
            sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
          );

          const applied: Order[] = [];
          for (const existing of validUpdates) {
            if (newStatus === 'cancelled') {
              await releaseOrderSerialAllocations(tx, {
                organizationId: ctx.organizationId,
                orderId: existing.id,
                orderNumber: existing.orderNumber,
                userId: ctx.user.id,
              });
            }

            const updatedOrder = await applyOrderStatusUpdate(tx, {
              organizationId: ctx.organizationId,
              existing,
              newStatus,
              userId: ctx.user.id,
              notes,
            });

            if (!updatedOrder) {
              failed.push(`${existing.id}: Status was modified concurrently`);
              continue;
            }

            applied.push(updatedOrder);
          }

          return applied;
        });

        updated.push(...committedUpdates);
        changedOrders.push(...committedUpdates);
      }

      await queueStatusArtifacts(ctx.organizationId, changedOrders);

      for (const order of changedOrders) {
        logOrderStatusChange(logger, order, {
          previousStatus: '',
          newStatus: order.status,
          notes,
          bulk: true,
        });
      }

      const errorsById: Record<string, string> = {};
      for (const errorLine of failed) {
        const [failedId, ...rest] = errorLine.split(':');
        if (failedId && rest.length > 0) {
          errorsById[failedId.trim()] = rest.join(':').trim();
        }
      }

      return {
        updated: updated.length,
        failed,
        success: true,
        message:
          failed.length > 0
            ? `Updated ${updated.length} orders with ${failed.length} failures.`
            : `Updated ${updated.length} orders.`,
        affectedIds: updated.map((order) => order.id),
        errorsById: Object.keys(errorsById).length > 0 ? errorsById : undefined,
        partialFailure:
          failed.length > 0
            ? {
                code: 'transition_blocked',
                message: 'Some orders could not be updated due to state transition constraints.',
              }
            : undefined,
      };
    }
  );

'use server'

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { orders, orderLineItems, orderShipments } from 'drizzle/schema';
import { withAuth, requirePermission } from '@/lib/server/protected';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
  type SerializedMutationEnvelope,
} from '@/lib/server/serialized-mutation-contract';
import {
  changeOrderStatusManagedSchema,
  getOrderWorkflowOptionsSchema,
  getOrderStatusOptionsSchema,
  orderStatusValues,
  updateOrderStatusSchema,
  type ChangeOrderStatusManagedInput,
  type OrderWorkflowAction,
  type OrderStatusOption,
  type OrderStatus,
} from '@/lib/schemas/orders';
import type { SerializedMutationErrorCode } from '@/lib/schemas/inventory';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import { releaseOrderSerialAllocations } from './order-serial-side-effects';
import { queueStatusArtifacts } from './order-status-effects';
import { applyOrderStatusUpdate } from './order-status-persistence';
import { logOrderStatusChange } from './order-status-activity';
import { validateStatusTransition } from './order-status-policy';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getPendingShipmentReservations } from './order-pending-shipment-reservations';

export { validateStatusTransition } from './order-status-policy';

type Order = typeof orders.$inferSelect;

const MANAGED_ROLLBACK_TRANSITIONS: Array<{
  from: OrderStatus;
  to: OrderStatus;
}> = [
  { from: 'picked', to: 'picking' },
  { from: 'picking', to: 'confirmed' },
];

function isManagedRollbackTransition(current: OrderStatus, target: OrderStatus) {
  return MANAGED_ROLLBACK_TRANSITIONS.some(
    (transition) => transition.from === current && transition.to === target
  );
}

function getStatusOptionLabel(status: OrderStatus) {
  switch (status) {
    case 'draft':
      return 'Move to Draft';
    case 'confirmed':
      return 'Move to Confirmed';
    case 'picking':
      return 'Move to Picking';
    case 'picked':
      return 'Move to Picked';
    case 'partially_shipped':
      return 'Move to Partially Shipped';
    case 'shipped':
      return 'Move to Shipped';
    case 'delivered':
      return 'Move to Delivered';
    case 'cancelled':
      return 'Cancel Order';
    default:
      return status;
  }
}

async function getShippedQuantityState(organizationId: string, orderId: string) {
  const [shippedState] = await db
    .select({
      hasShippedQty: sql<boolean>`coalesce(bool_or(${orderLineItems.qtyShipped} > 0), false)`,
      hasDeliveredQty: sql<boolean>`coalesce(bool_or(${orderLineItems.qtyDelivered} > 0), false)`,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.organizationId, organizationId),
        eq(orderLineItems.orderId, orderId)
      )
    );

  return {
    hasShippedQty: Boolean(shippedState?.hasShippedQty),
    hasDeliveredQty: Boolean(shippedState?.hasDeliveredQty),
  };
}

async function buildManagedStatusOptions(
  ctx: Awaited<ReturnType<typeof withAuth>>,
  order: Order
) {
  const currentStatus = order.status as OrderStatus;
  const quantityState = await getShippedQuantityState(ctx.organizationId, order.id);

  return orderStatusValues
    .filter((status) => status !== currentStatus)
    .map((status): OrderStatusOption => {
      if (status === 'cancelled') {
        if (!validateStatusTransition(currentStatus, status)) {
          return {
            status,
            label: getStatusOptionLabel(status),
            category: 'blocked',
            disabledReason: 'Cancellation is not available from the current lifecycle state.',
          };
        }
        if (quantityState.hasShippedQty) {
          return {
            status,
            label: getStatusOptionLabel(status),
            category: 'blocked',
            disabledReason:
              'Cannot cancel after shipped quantities exist. Use shipment recovery, RMA, or an amendment instead.',
          };
        }
        return {
          status,
          label: getStatusOptionLabel(status),
          category: 'recommended',
          mode: 'forward',
          description: 'Stops further operational work on this order.',
          warning: 'Cancelling will release any active serial allocations.',
        };
      }

      if (validateStatusTransition(currentStatus, status)) {
        return {
          status,
          label: getStatusOptionLabel(status),
          category: 'recommended',
          mode: 'forward',
        };
      }

      if (isManagedRollbackTransition(currentStatus, status)) {
        return {
          status,
          label: getStatusOptionLabel(status),
          category: 'rollback',
          mode: 'rollback',
          description: 'Moves the order back one operational step before shipment.',
        };
      }

      if (currentStatus === 'partially_shipped' && status === 'picked') {
        return {
          status,
          label: getStatusOptionLabel(status),
          category: 'blocked',
          mode: 'rollback',
          disabledReason:
            quantityState.hasShippedQty || quantityState.hasDeliveredQty
              ? 'Rollback from partially shipped requires reversing shipment truth first.'
              : 'Rollback is unavailable until shipment quantities are fully reversed.',
        };
      }

      if (currentStatus === 'shipped' || currentStatus === 'delivered') {
        return {
          status,
          label: getStatusOptionLabel(status),
          category: 'blocked',
          disabledReason:
            status === 'delivered'
              ? 'Use shipment delivery confirmation to complete delivery.'
              : 'Use shipment actions, amendments, or RMAs instead of overriding post-shipment status.',
        };
      }

      return {
        status,
        label: getStatusOptionLabel(status),
        category: 'blocked',
        disabledReason: 'This status is not reachable from the current order state.',
      };
    });
}

async function buildOrderWorkflowOptions(
  ctx: Awaited<ReturnType<typeof withAuth>>,
  order: Order
) {
  const currentStatus = order.status as OrderStatus;
  const quantityState = await getShippedQuantityState(ctx.organizationId, order.id);
  const pendingReservations = await getPendingShipmentReservations(db, {
    organizationId: ctx.organizationId,
    orderId: order.id,
  });
  const shipmentRows = await db
    .select({
      id: orderShipments.id,
      status: orderShipments.status,
      shipmentNumber: orderShipments.shipmentNumber,
    })
    .from(orderShipments)
    .where(
      and(
        eq(orderShipments.organizationId, ctx.organizationId),
        eq(orderShipments.orderId, order.id)
      )
    );

  const pendingShipmentCount = pendingReservations.pendingShipmentIds.size;
  const deliveryCandidates = shipmentRows.filter(
    (shipment) =>
      shipment.status === 'in_transit' || shipment.status === 'out_for_delivery'
  );
  const reopenableShipments = shipmentRows.filter((shipment) =>
    shipment.status === 'in_transit' ||
    shipment.status === 'out_for_delivery' ||
    shipment.status === 'failed'
  );
  const hasPendingShipments = pendingShipmentCount > 0;
  const canCancel = !quantityState.hasShippedQty && !hasPendingShipments;

  const actions: OrderWorkflowAction[] = [];
  const addAction = (action: OrderWorkflowAction) => {
    actions.push(action);
  };

  const addCancelAction = () => {
    if (canCancel) {
      addAction({
        key: 'cancel_order',
        label: 'Cancel Order',
        category: 'recovery',
        description: 'Stop operational work on this order before anything ships.',
      });
      return;
    }

    addAction({
      key: 'cancel_order',
      label: 'Cancel Order',
      category: 'blocked',
      disabledReason: hasPendingShipments
        ? 'Resolve or delete pending shipment drafts before cancelling this order.'
        : 'Orders with shipped quantities must be recovered through shipments, RMAs, or amendments.',
    });
  };

  switch (currentStatus) {
    case 'draft':
      addAction({
        key: 'confirm_order',
        label: 'Confirm Order',
        category: 'next',
        description: 'Lock the draft and move it into the fulfillment workflow.',
      });
      addCancelAction();
      break;
    case 'confirmed':
      addAction({
        key: 'open_pick',
        label: 'Start Picking',
        category: 'next',
        description: 'Open the picking workflow and start allocating stock.',
      });
      addCancelAction();
      break;
    case 'picking':
      addAction({
        key: 'open_pick',
        label: 'Resume Picking',
        category: 'next',
        description: 'Continue picking and resolve any remaining lines.',
      });
      addCancelAction();
      break;
    case 'picked':
      addAction({
        key: hasPendingShipments ? 'open_shipments' : 'open_ship',
        label: hasPendingShipments ? 'Manage Pending Shipments' : 'Create Shipment',
        category: 'next',
        description: hasPendingShipments
          ? 'Review the shipment drafts already created for this order.'
          : 'Open the shipping workflow and assemble the outbound shipment.',
      });
      if (hasPendingShipments) {
        addAction({
          key: 'open_pick',
          label: 'Reopen Picking',
          category: 'blocked',
          disabledReason:
            'Resolve or delete pending shipment drafts before reopening picking for this order.',
        });
      } else {
        addAction({
          key: 'open_pick',
          label: 'Reopen Picking',
          category: 'recovery',
          description: 'Adjust picked quantities before the shipment is finalized.',
        });
      }
      addCancelAction();
      break;
    case 'partially_shipped':
      if (deliveryCandidates.length === 1) {
        addAction({
          key: 'confirm_delivery',
          label: 'Confirm Delivery',
          category: 'next',
          shipmentId: deliveryCandidates[0].id,
          description: `Confirm delivery for shipment ${deliveryCandidates[0].shipmentNumber}.`,
        });
      }
      addAction({
        key: hasPendingShipments ? 'open_shipments' : 'open_ship',
        label: hasPendingShipments ? 'Manage Shipments' : 'Ship Remaining',
        category: 'next',
        description: hasPendingShipments
          ? 'Open the fulfillment tab to continue the remaining shipment work.'
          : 'Create the next shipment for the unshipped remainder.',
      });
      reopenableShipments.forEach((shipment) => {
        addAction({
          key: 'reopen_shipment',
          label: `Reopen ${shipment.shipmentNumber}`,
          category: 'recovery',
          shipmentId: shipment.id,
          description: 'Move this shipment back to pending so the shipping details can be corrected.',
        });
      });
      addAction({
        key: 'cancel_order',
        label: 'Cancel Order',
        category: 'blocked',
        disabledReason:
          'Orders with shipped quantities cannot be cancelled from order detail. Use shipment recovery, RMA, or an amendment instead.',
      });
      break;
    case 'shipped':
      if (deliveryCandidates.length === 1) {
        addAction({
          key: 'confirm_delivery',
          label: 'Confirm Delivery',
          category: 'next',
          shipmentId: deliveryCandidates[0].id,
          description: `Confirm delivery for shipment ${deliveryCandidates[0].shipmentNumber}.`,
        });
      }
      addAction({
        key: 'open_shipments',
        label: 'Manage Shipments',
        category: 'recovery',
        description: 'Review shipment progress, tracking, and delivery confirmations.',
      });
      reopenableShipments.forEach((shipment) => {
        addAction({
          key: 'reopen_shipment',
          label: `Reopen ${shipment.shipmentNumber}`,
          category: 'recovery',
          shipmentId: shipment.id,
          description: 'Move this shipment back to pending so the shipping details can be corrected.',
        });
      });
      addAction({
        key: 'cancel_order',
        label: 'Cancel Order',
        category: 'blocked',
        disabledReason:
          'Orders with shipped quantities cannot be cancelled from order detail. Use shipment recovery, RMA, or an amendment instead.',
      });
      break;
    case 'delivered':
      addAction({
        key: 'open_shipments',
        label: 'View Shipments',
        category: 'recovery',
        description: 'Review shipment history and completed delivery evidence.',
      });
      addAction({
        key: 'cancel_order',
        label: 'Cancel Order',
        category: 'blocked',
        disabledReason:
          'Delivered orders cannot be cancelled from order detail. Use RMA or amendment workflows instead.',
      });
      break;
    default:
      addAction({
        key: 'cancel_order',
        label: 'Cancel Order',
        category: 'blocked',
        disabledReason: 'No managed workflow actions are available from the current order state.',
      });
      break;
  }

  return actions;
}

async function executeManagedOrderStatusChange(
  ctx: Awaited<ReturnType<typeof withAuth>>,
  payload: {
    existing: Order;
    newStatus: OrderStatus;
    notes?: string;
    idempotencyKey?: string;
    allowRollback?: boolean;
  }
): Promise<SerializedMutationEnvelope<Order>> {
  const logger = createActivityLoggerWithContext(ctx);
  const currentStatus = payload.existing.status as OrderStatus;
  const newStatus = payload.newStatus;
  const transitionName = payload.allowRollback
    ? 'order_status_managed_rollback'
    : 'order_status_managed_update';
  const idempotencyKey = payload.idempotencyKey?.trim();

  if (idempotencyKey) {
    const replayed = await hasProcessedIdempotencyKey(db, {
      organizationId: ctx.organizationId,
      entityType: 'order',
      entityId: payload.existing.id,
      action: 'updated',
      idempotencyKey,
    });
    if (replayed) {
      return serializedMutationSuccess(
        payload.existing,
        `Idempotent replay ignored. Order remains in ${currentStatus} status.`,
        {
          affectedIds: [payload.existing.id],
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
    return serializedMutationSuccess(
      payload.existing,
      `Order already in ${newStatus} status.`,
      {
        affectedIds: [payload.existing.id],
        transition: {
          transition: transitionName,
          fromStatus: currentStatus,
          toStatus: newStatus,
        },
      }
    );
  }

  const updated = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );
    if (newStatus === 'cancelled') {
      await releaseOrderSerialAllocations(tx, {
        organizationId: ctx.organizationId,
        orderId: payload.existing.id,
        orderNumber: payload.existing.orderNumber,
        userId: ctx.user.id,
      });
    }

    const result = await applyOrderStatusUpdate(tx, {
      organizationId: ctx.organizationId,
      existing: payload.existing,
      newStatus,
      userId: ctx.user.id,
      notes: payload.notes,
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
    notes: payload.notes,
    idempotencyKey,
  });

  return serializedMutationSuccess(updated, `Order status updated to ${newStatus}.`, {
    affectedIds: [updated.id],
    transition: {
      transition: transitionName,
      fromStatus: currentStatus,
      toStatus: newStatus,
    },
  });
}

export const getOrderStatusOptions = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getOrderStatusOptionsSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.update });

    const [existing] = await db
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

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    return {
      orderId: existing.id,
      currentStatus: existing.status as OrderStatus,
      options: await buildManagedStatusOptions(ctx, existing),
    };
  });

export const getOrderWorkflowOptions = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getOrderWorkflowOptionsSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.update });

    const [existing] = await db
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

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    return {
      orderId: existing.id,
      currentStatus: existing.status as OrderStatus,
      actions: await buildOrderWorkflowOptions(ctx, existing),
    };
  });

export const changeOrderStatusManaged = createServerFn({ method: 'POST' })
  .inputValidator(changeOrderStatusManagedSchema)
  .handler(async ({ data }: { data: ChangeOrderStatusManagedInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.update });

    const [existing] = await db
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

    if (!existing) {
      throw new NotFoundError('Order not found', 'order');
    }

    const currentStatus = existing.status as OrderStatus;
    const targetStatus = data.targetStatus as OrderStatus;
    const quantityState = await getShippedQuantityState(ctx.organizationId, existing.id);
    const isRollback = isManagedRollbackTransition(currentStatus, targetStatus);
    const isForward = validateStatusTransition(currentStatus, targetStatus);

    if (targetStatus === 'cancelled') {
      requirePermission(ctx, PERMISSIONS.order.cancel);
      if (quantityState.hasShippedQty) {
        throw createSerializedMutationError(
          'Cannot cancel order with shipped items. Use shipment recovery or RMA first.',
          'shipped_status_conflict'
        );
      }
    } else {
      requirePermission(ctx, PERMISSIONS.order.fulfill);
    }

    if (!isForward && !isRollback) {
      throw createSerializedMutationError(
        `Invalid managed status change: cannot move from '${currentStatus}' to '${targetStatus}'.`,
        'transition_blocked'
      );
    }

    if (currentStatus === 'partially_shipped' && targetStatus === 'picked') {
      throw createSerializedMutationError(
        'Rollback from partially shipped requires reversing shipment truth first.',
        'transition_blocked'
      );
    }

    return executeManagedOrderStatusChange(ctx, {
      existing,
      newStatus: targetStatus,
      notes: data.reason,
      idempotencyKey: data.idempotencyKey,
      allowRollback: isRollback && !isForward,
    });
  });

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

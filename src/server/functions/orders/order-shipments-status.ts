'use server'

import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import {
  activities,
  orderLineItems,
  orderShipments,
  serializedItems,
  shipmentItems,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  findSerializedItemBySerial,
} from '@/server/functions/_shared/serialized-lineage';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import { bumpOrderAggregateVersion } from '@/server/functions/orders/_order-aggregate';
import {
  confirmDeliverySchema,
  updateShipmentStatusSchema,
} from '@/lib/schemas';
import { normalizeSerial } from '@/lib/serials';
import { serializedMutationSuccess } from '@/lib/server/serialized-mutation-contract';
import { validateShipmentStatusTransition } from './order-shipments-validation';
import { recomputeOrderFulfillmentStatus } from './order-fulfillment-status';

const _addTrackingEventInputSchema = z.object({
  shipmentId: z.string().uuid(),
  event: z.object({
    timestamp: z.string().datetime(),
    status: z.string().min(1).max(100),
    location: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
  }),
});

export async function updateShipmentStatusHandler({
  data,
}: {
  data: z.infer<typeof updateShipmentStatusSchema>;
}) {
  const ctx = await withAuth();
  const transitionName = 'shipment_status_update';
  const idempotencyKey = data.idempotencyKey?.trim();

  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(
      and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  if (idempotencyKey) {
    const replayed = await hasProcessedIdempotencyKey(db, {
      organizationId: ctx.organizationId,
      entityType: 'shipment',
      entityId: existing.id,
      action: 'updated',
      idempotencyKey,
    });
    if (replayed) {
      return serializedMutationSuccess(
        existing,
        `Idempotent replay ignored. Shipment remains in ${existing.status} status.`,
        {
          affectedIds: [existing.id],
          transition: {
            transition: transitionName,
            fromStatus: existing.status,
            toStatus: existing.status,
            blockedBy: 'idempotency_key_replay',
          },
        }
      );
    }
  }

  if (existing.status === data.status) {
    return serializedMutationSuccess(existing, `Shipment already in ${data.status} status.`, {
      affectedIds: [existing.id],
      transition: {
        transition: transitionName,
        fromStatus: existing.status,
        toStatus: data.status,
      },
    });
  }

  if (!validateShipmentStatusTransition(existing.status, data.status)) {
    throw new ValidationError('Invalid status transition', {
      status: [`Cannot transition from ${existing.status} to ${data.status}`],
      code: ['transition_blocked'],
    });
  }

  const trackingEvents = [...(existing.trackingEvents || [])];
  if (data.trackingEvent) {
    trackingEvents.push(data.trackingEvent);
  } else {
    trackingEvents.push({
      timestamp: new Date().toISOString(),
      status: data.status,
      description: `Status changed to ${data.status}`,
    });
  }

  const updateValues: Partial<typeof orderShipments.$inferInsert> = {
    status: data.status,
    trackingEvents,
    updatedBy: ctx.user.id,
  };

  if (data.status === 'delivered') {
    updateValues.deliveredAt = new Date();
    if (data.deliveryConfirmation) {
      updateValues.deliveryConfirmation = data.deliveryConfirmation;
    }

    const shipment = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const items = await tx
        .select()
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, data.id));

      for (const item of items) {
        await tx
          .update(orderLineItems)
          .set({
            qtyDelivered: sql`${orderLineItems.qtyDelivered} + ${item.quantity}`,
          })
          .where(eq(orderLineItems.id, item.orderLineItemId));
      }

      await bumpOrderAggregateVersion(tx, {
        orderId: existing.orderId,
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
      });

      const [updatedShipment] = await tx
        .update(orderShipments)
        .set(updateValues)
        .where(eq(orderShipments.id, data.id))
        .returning();

      await tx.insert(activities).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: 'shipment',
        entityId: updatedShipment.id,
        action: 'updated',
        description: `Shipment status updated: ${existing.status} -> ${data.status}`,
        metadata: {
          shipmentNumber: updatedShipment.shipmentNumber,
          previousStatus: existing.status,
          newStatus: data.status,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        createdBy: ctx.user.id,
      });

      return updatedShipment;
    });

    return serializedMutationSuccess(shipment, `Shipment status updated to ${data.status}.`, {
      affectedIds: [shipment.id],
      transition: {
        transition: transitionName,
        fromStatus: existing.status,
        toStatus: data.status,
      },
    });
  }

  if (data.status === 'returned') {
    const shipment = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const [updatedShipment] = await tx
        .update(orderShipments)
        .set(updateValues)
        .where(eq(orderShipments.id, data.id))
        .returning();

      const items = await tx
        .select({
          id: shipmentItems.id,
          serialNumbers: shipmentItems.serialNumbers,
        })
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, data.id));

      for (const item of items) {
        const serials = ((item.serialNumbers as string[] | null) ?? [])
          .map((serial) => normalizeSerial(serial))
          .filter((serial) => serial.length > 0);
        for (const serial of serials) {
          const serializedItem = await findSerializedItemBySerial(tx, ctx.organizationId, serial, {
            userId: ctx.user.id,
            source: 'order_shipment_returned',
          });
          if (!serializedItem) continue;

          await tx
            .update(serializedItems)
            .set({
              status: 'returned',
              currentInventoryId: null,
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(eq(serializedItems.id, serializedItem.id));

          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId: serializedItem.id,
            eventType: 'returned',
            entityType: 'shipment_item',
            entityId: item.id,
            notes: `Shipment ${existing.shipmentNumber} marked returned`,
            userId: ctx.user.id,
          });
        }
      }

      await tx.insert(activities).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: 'shipment',
        entityId: updatedShipment.id,
        action: 'updated',
        description: `Shipment status updated: ${existing.status} -> ${data.status}`,
        metadata: {
          shipmentNumber: updatedShipment.shipmentNumber,
          previousStatus: existing.status,
          newStatus: data.status,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        createdBy: ctx.user.id,
      });

      return updatedShipment;
    });

    return serializedMutationSuccess(shipment, `Shipment status updated to ${data.status}.`, {
      affectedIds: [shipment.id],
      transition: {
        transition: transitionName,
        fromStatus: existing.status,
        toStatus: data.status,
      },
    });
  }

  const [shipment] = await db
    .update(orderShipments)
    .set(updateValues)
    .where(eq(orderShipments.id, data.id))
    .returning();

  await db.insert(activities).values({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    entityType: 'shipment',
    entityId: shipment.id,
    action: 'updated',
    description: `Shipment status updated: ${existing.status} -> ${data.status}`,
    metadata: {
      shipmentNumber: shipment.shipmentNumber,
      previousStatus: existing.status,
      newStatus: data.status,
      idempotencyKey: idempotencyKey ?? undefined,
    },
    createdBy: ctx.user.id,
  });

  return serializedMutationSuccess(shipment, `Shipment status updated to ${data.status}.`, {
    affectedIds: [shipment.id],
    transition: {
      transition: transitionName,
      fromStatus: existing.status,
      toStatus: data.status,
    },
  });
}

export async function confirmDeliveryHandler({
  data,
}: {
  data: z.infer<typeof confirmDeliverySchema>;
}) {
  const ctx = await withAuth();
  const idempotencyKey = data.idempotencyKey.trim();

  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(
      and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  const replayed = await hasProcessedIdempotencyKey(db, {
    organizationId: ctx.organizationId,
    entityType: 'shipment',
    entityId: existing.id,
    action: 'updated',
    idempotencyKey,
  });

  if (replayed) {
    return existing;
  }

  if (!['in_transit', 'out_for_delivery'].includes(existing.status)) {
    throw new ValidationError('Shipment cannot be confirmed as delivered', {
      status: [`Current status is ${existing.status}`],
    });
  }

  const deliveredAt = data.deliveredAt || new Date();
  const trackingEvents = [...(existing.trackingEvents || [])];
  trackingEvents.push({
    timestamp: deliveredAt.toISOString(),
    status: 'delivered',
    description: data.signedBy ? `Delivered and signed by ${data.signedBy}` : 'Delivered',
  });

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );
    const [updatedShipment] = await tx
      .update(orderShipments)
      .set({
        status: 'delivered',
        deliveredAt,
        deliveryConfirmation: {
          signedBy: data.signedBy,
          signature: data.signature,
          photoUrl: data.photoUrl,
          confirmedAt: deliveredAt.toISOString(),
          notes: data.notes,
        },
        trackingEvents,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderShipments.id, data.id))
      .returning();

    const items = await tx
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, data.id));

    for (const item of items) {
      await tx
        .update(orderLineItems)
        .set({
          qtyDelivered: sql`${orderLineItems.qtyDelivered} + ${item.quantity}`,
        })
        .where(eq(orderLineItems.id, item.orderLineItemId));
    }

    await recomputeOrderFulfillmentStatus(tx, {
      organizationId: ctx.organizationId,
      orderId: existing.orderId,
      userId: ctx.user.id,
      deliveredAt,
    });

    await tx.insert(activities).values({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      entityType: 'shipment',
      entityId: updatedShipment.id,
      action: 'updated',
      description: `Shipment status updated: ${existing.status} -> delivered`,
      metadata: {
        shipmentNumber: updatedShipment.shipmentNumber,
        previousStatus: existing.status,
        newStatus: 'delivered',
        idempotencyKey,
      },
      createdBy: ctx.user.id,
    });

    return updatedShipment;
  });
}

export async function addTrackingEventHandler({
  data,
}: {
  data: z.infer<typeof _addTrackingEventInputSchema>;
}) {
  const ctx = await withAuth();

  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(
      and(
        eq(orderShipments.id, data.shipmentId),
        eq(orderShipments.organizationId, ctx.organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  const trackingEvents = [...(existing.trackingEvents || []), data.event];

  const [shipment] = await db
    .update(orderShipments)
    .set({
      trackingEvents,
      updatedBy: ctx.user.id,
    })
    .where(eq(orderShipments.id, data.shipmentId))
    .returning();

  return shipment;
}

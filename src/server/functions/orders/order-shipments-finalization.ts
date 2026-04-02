'use server'

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import {
  activities,
  orderLineItems,
  orderLineSerialAllocations,
  orderShipments,
  orders,
  serializedItems,
  shipmentItems,
} from 'drizzle/schema';
import {
  inventory,
  inventoryMovements,
} from 'drizzle/schema/inventory/inventory';
import { products } from 'drizzle/schema/products/products';
import {
  addSerializedItemEvent,
  findSerializedItemBySerial,
  linkSerializedItemToShipmentItem,
  releaseSerializedItemAllocation,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  assertSerializedInventoryCostIntegrity,
  consumeLayersFIFO,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import { hasProcessedIdempotencyKey } from '@/server/functions/_shared/idempotency';
import { fulfillmentImportSchema } from '@/lib/schemas/orders/shipments';
import { markShippedSchema } from '@/lib/schemas';
import { generateTrackingUrl } from './order-shipments-shared';
import type { OrderShipment } from './order-shipment-types';
import { recomputeOrderFulfillmentStatus } from './order-fulfillment-status';

type MarkShippedInput = z.infer<typeof markShippedSchema>;

export async function markShipmentAsShipped(
  ctx: Awaited<ReturnType<typeof withAuth>>,
  data: MarkShippedInput
): Promise<OrderShipment> {
  const [existing] = await db
    .select()
    .from(orderShipments)
    .where(and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Shipment not found');
  }

  if (existing.status !== 'pending') {
    throw new ValidationError('Shipment already shipped', {
      status: [`Current status is ${existing.status}`],
    });
  }

  const shippedAt = data.shippedAt || new Date();
  const trackingUrl =
    data.trackingUrl || generateTrackingUrl(data.carrier, data.trackingNumber ?? null);

  const trackingEvents = [
    {
      timestamp: shippedAt.toISOString(),
      status: 'Shipped',
      description: `Package picked up by ${data.carrier}`,
    },
  ];

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );

    const [updatedShipment] = await tx
      .update(orderShipments)
      .set({
        status: 'in_transit',
        carrier: data.carrier,
        carrierService: data.carrierService,
        trackingNumber: data.trackingNumber,
        trackingUrl,
        shippedAt,
        shippedBy: ctx.user.id,
        trackingEvents,
        updatedBy: ctx.user.id,
        ...(data.shippingCost !== undefined && { shippingCost: data.shippingCost }),
      })
      .where(eq(orderShipments.id, data.id))
      .returning();

    const items = await tx
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, data.id));

    const sortedItems = [...items].sort((a, b) =>
      a.orderLineItemId.localeCompare(b.orderLineItemId)
    );

    const lineItemIds = sortedItems.map((item) => item.orderLineItemId);
    const canonicalAllocations =
      lineItemIds.length > 0
        ? await tx
            .select({
              lineItemId: orderLineSerialAllocations.orderLineItemId,
              allocationId: orderLineSerialAllocations.id,
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
                eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
                eq(orderLineSerialAllocations.isActive, true),
                inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
              )
            )
        : [];
    const canonicalAllocationsByLineItem = new Map<
      string,
      Array<{
        allocationId: string;
        serializedItemId: string;
        serialNumber: string;
      }>
    >();
    for (const allocation of canonicalAllocations) {
      const existingAllocations =
        canonicalAllocationsByLineItem.get(allocation.lineItemId) ?? [];
      existingAllocations.push({
        allocationId: allocation.allocationId,
        serializedItemId: allocation.serializedItemId,
        serialNumber: allocation.serialNumber,
      });
      canonicalAllocationsByLineItem.set(allocation.lineItemId, existingAllocations);
    }

    for (const item of sortedItems) {
      await tx
        .update(orderLineItems)
        .set({
          qtyShipped: sql`${orderLineItems.qtyShipped} + ${item.quantity}`,
        })
        .where(eq(orderLineItems.id, item.orderLineItemId));

      const [lineItemWithProduct] = await tx
        .select({
          productId: orderLineItems.productId,
          productName: orderLineItems.description,
          isSerialized: products.isSerialized,
        })
        .from(orderLineItems)
        .leftJoin(
          products,
          and(
            eq(orderLineItems.productId, products.id),
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt)
          )
        )
        .where(eq(orderLineItems.id, item.orderLineItemId))
        .limit(1);

      if (!lineItemWithProduct?.productId) {
        continue;
      }

      const [inventoryItem] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, lineItemWithProduct.productId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (inventoryItem) {
        const movementCogs = await consumeLayersFIFO(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inventoryItem.id,
          quantity: item.quantity,
        });

        await tx
          .update(inventory)
          .set({
            quantityOnHand: sql`${inventory.quantityOnHand} - ${item.quantity}`,
            quantityAllocated: sql`${inventory.quantityAllocated} - ${item.quantity}`,
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, inventoryItem.id));

        await recomputeInventoryValueFromLayers(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inventoryItem.id,
          userId: ctx.user.id,
        });

        await tx.insert(inventoryMovements).values({
          organizationId: ctx.organizationId,
          inventoryId: inventoryItem.id,
          productId: inventoryItem.productId,
          locationId: inventoryItem.locationId,
          movementType: 'ship',
          quantity: -item.quantity,
          previousQuantity: Number(inventoryItem.quantityOnHand),
          newQuantity: Number(inventoryItem.quantityOnHand) - Number(item.quantity),
          unitCost:
            movementCogs.quantityConsumed > 0
              ? movementCogs.totalCost / movementCogs.quantityConsumed
              : 0,
          totalCost: movementCogs.totalCost,
          referenceType: 'shipment',
          referenceId: updatedShipment.id,
          notes: `Shipment ${updatedShipment.shipmentNumber}`,
          createdBy: ctx.user.id,
        });

        if (lineItemWithProduct.isSerialized) {
          const rawSerials = (item.serialNumbers as string[] | null) ?? [];
          const shipmentSerials = rawSerials
            .map((serial) => serial.trim().toUpperCase())
            .filter(Boolean);
          const canonicalForLine = canonicalAllocationsByLineItem.get(item.orderLineItemId) ?? [];

          for (const serial of shipmentSerials) {
            const canonicalAllocation = canonicalForLine.find(
              (allocation) => allocation.serialNumber === serial
            );
            const serialRecord = canonicalAllocation
              ? {
                  id: canonicalAllocation.serializedItemId,
                  serialNumber: serial,
                }
              : await findSerializedItemBySerial(tx, ctx.organizationId, serial, {
                  userId: ctx.user.id,
                  source: 'order_shipment_mark_shipped',
                });

            if (!serialRecord) {
              continue;
            }

            if (canonicalAllocation) {
              await releaseSerializedItemAllocation(tx, {
                organizationId: ctx.organizationId,
                serializedItemId: canonicalAllocation.serializedItemId,
                userId: ctx.user.id,
              });
            } else {
              await tx
                .update(orderLineSerialAllocations)
                .set({
                  isActive: false,
                  releasedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
                    eq(orderLineSerialAllocations.orderLineItemId, item.orderLineItemId),
                    eq(orderLineSerialAllocations.serializedItemId, serialRecord.id),
                    eq(orderLineSerialAllocations.isActive, true)
                  )
                );
            }

            await tx
              .update(serializedItems)
              .set({
                currentInventoryId: inventoryItem.id,
                status: 'shipped',
                updatedAt: new Date(),
                updatedBy: ctx.user.id,
              })
              .where(eq(serializedItems.id, serialRecord.id));

            await linkSerializedItemToShipmentItem(tx, {
              organizationId: ctx.organizationId,
              shipmentItemId: item.id,
              serializedItemId: serialRecord.id,
              userId: ctx.user.id,
            });

            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId: serialRecord.id,
              eventType: 'shipped',
              entityType: 'shipment_item',
              entityId: item.id,
              notes: `Shipment ${updatedShipment.shipmentNumber} dispatched`,
              userId: ctx.user.id,
            });
          }
        } else {
          await upsertSerializedItemForInventory(tx, {
            organizationId: ctx.organizationId,
            productId: lineItemWithProduct.productId,
            inventoryId: inventoryItem.id,
            serialNumber: `LOT-${item.id}`,
            userId: ctx.user.id,
          }).catch(() => undefined);
        }

        if (inventoryItem.serialNumber) {
          await assertSerializedInventoryCostIntegrity(tx, {
            organizationId: ctx.organizationId,
            inventoryId: inventoryItem.id,
            serialNumber: inventoryItem.serialNumber,
            expectedQuantityOnHand: 0,
          });
        }
      }
    }

    await recomputeOrderFulfillmentStatus(tx, {
      organizationId: ctx.organizationId,
      orderId: existing.orderId,
      userId: ctx.user.id,
      shippedAt,
    });

    await tx.insert(activities).values({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      entityType: 'shipment',
      entityId: updatedShipment.id,
      action: 'updated',
      description: `Shipment marked as shipped: ${updatedShipment.shipmentNumber}`,
      metadata: {
        shipmentNumber: updatedShipment.shipmentNumber,
        previousStatus: existing.status,
        newStatus: updatedShipment.status,
        idempotencyKey: data.idempotencyKey,
      },
      createdBy: ctx.user.id,
    });

    return updatedShipment;
  });
}

export async function markShippedHandler({
  data,
}: {
  data: MarkShippedInput;
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
    return {
      ...existing,
      success: true as const,
      message: 'Shipment mark-as-shipped replay ignored.',
      affectedIds: [existing.id],
    };
  }

  const shipment = await markShipmentAsShipped(ctx, data);
  return {
    ...shipment,
    success: true as const,
    message: 'Shipment marked as shipped.',
    affectedIds: [shipment.id],
  };
}

export async function importFulfillmentShipmentsHandler({
  data,
}: {
  data: z.infer<typeof fulfillmentImportSchema>;
}): Promise<{
  imported: number;
  failed: number;
  skipped: number;
  results: Array<{
    orderNumber: string;
    shipmentId?: string;
    shipmentNumber?: string | null;
    status: 'imported' | 'skipped' | 'failed';
    message?: string;
  }>;
}> {
  const ctx = await withAuth();
  const results: Array<{
    orderNumber: string;
    shipmentId?: string;
    shipmentNumber?: string | null;
    status: 'imported' | 'skipped' | 'failed';
    message?: string;
  }> = [];

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const uniqueOrderNumbers = [...new Set(data.rows.map((row) => row.orderNumber))];
  const allOrders =
    uniqueOrderNumbers.length > 0
      ? await db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              eq(orders.organizationId, ctx.organizationId),
              inArray(orders.orderNumber, uniqueOrderNumbers),
              isNull(orders.deletedAt)
            )
          )
      : [];
  const orderByNumber = new Map(allOrders.map((order) => [order.orderNumber, order]));

  for (const row of data.rows) {
    try {
      const order = orderByNumber.get(row.orderNumber);

      if (!order) {
        skipped += 1;
        results.push({
          orderNumber: row.orderNumber,
          status: 'skipped',
          message: 'Order not found',
        });
        continue;
      }

      let shipment: OrderShipment | undefined;

      if (row.shipmentNumber) {
        const [matched] = await db
          .select()
          .from(orderShipments)
          .where(
            and(
              eq(orderShipments.organizationId, ctx.organizationId),
              eq(orderShipments.orderId, order.id),
              eq(orderShipments.shipmentNumber, row.shipmentNumber)
            )
          )
          .limit(1);

        shipment = matched;
      } else {
        const [latestPending] = await db
          .select()
          .from(orderShipments)
          .where(
            and(
              eq(orderShipments.organizationId, ctx.organizationId),
              eq(orderShipments.orderId, order.id),
              eq(orderShipments.status, 'pending')
            )
          )
          .orderBy(desc(orderShipments.createdAt))
          .limit(1);

        shipment = latestPending;
      }

      if (!shipment) {
        skipped += 1;
        results.push({
          orderNumber: row.orderNumber,
          shipmentNumber: row.shipmentNumber ?? null,
          status: 'skipped',
          message: 'No matching shipment found',
        });
        continue;
      }

      if (shipment.status !== 'pending') {
        skipped += 1;
        results.push({
          orderNumber: row.orderNumber,
          shipmentId: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          status: 'skipped',
          message: `Shipment status is ${shipment.status}`,
        });
        continue;
      }

      if (data.dryRun) {
        skipped += 1;
        results.push({
          orderNumber: row.orderNumber,
          shipmentId: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          status: 'skipped',
          message: 'Dry run: no changes applied',
        });
        continue;
      }

      await markShipmentAsShipped(ctx, {
        id: shipment.id,
        idempotencyKey: `fulfillment-import:${shipment.id}:${row.trackingNumber}`,
        carrier: row.carrier,
        carrierService: row.carrierService,
        trackingNumber: row.trackingNumber,
        trackingUrl: row.trackingUrl,
        shippedAt: row.shippedAt,
      });

      imported += 1;
      results.push({
        orderNumber: row.orderNumber,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: 'imported',
      });
    } catch (error) {
      failed += 1;
      results.push({
        orderNumber: row.orderNumber,
        shipmentNumber: row.shipmentNumber ?? null,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { imported, failed, skipped, results };
}

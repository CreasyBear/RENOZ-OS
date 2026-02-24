/**
 * Order Shipments Server Functions
 *
 * Shipment creation, tracking, and delivery confirmation.
 *
 * @see drizzle/schema/order-shipments.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-SHIPPING-API)
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, gte, lte, isNull, sql, inArray, ilike } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { containsPattern } from '@/lib/db/utils';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  orderShipments,
  shipmentItems,
  orders,
  orderLineItems,
  serializedItems,
  orderLineSerialAllocations,
  activities,
} from 'drizzle/schema';
import {
  inventory,
  inventoryMovements,
  inventoryCostLayers,
} from 'drizzle/schema/inventory/inventory';
import { products } from 'drizzle/schema/products/products';
import { withAuth } from '@/lib/server/protected';
import { ValidationError, NotFoundError } from '@/lib/server/errors';
import { findDuplicateSerials, normalizeSerial } from '@/lib/serials';
import { serializedMutationSuccess, type SerializedMutationEnvelope } from '@/lib/server/serialized-mutation-contract';
import { fulfillmentImportSchema } from '@/lib/schemas/orders/shipments';
import {
  createShipmentSchema,
  updateShipmentSchema,
  markShippedSchema,
  confirmDeliverySchema,
  updateShipmentStatusSchema,
  shipmentParamsSchema,
  shipmentListQuerySchema,
  shipmentListCursorQuerySchema,
  type ShipmentStatus,
  type TrackingEvent,
} from '@/lib/schemas';
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

// ============================================================================
// TYPES
// ============================================================================

type OrderShipment = typeof orderShipments.$inferSelect;
type ShipmentItem = typeof shipmentItems.$inferSelect;
type MarkShippedInput = z.infer<typeof markShippedSchema>;

interface ShipmentWithItems extends OrderShipment {
  items: ShipmentItem[];
}

interface ListShipmentsResult {
  shipments: OrderShipment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique shipment number.
 */
async function generateShipmentNumber(organizationId: string, orderId: string): Promise<string> {
  // Get order number for prefix
  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Count existing shipments for this order
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderShipments)
    .where(
      and(eq(orderShipments.organizationId, organizationId), eq(orderShipments.orderId, orderId))
    );

  const shipmentNum = (count || 0) + 1;
  return `${order.orderNumber}-S${String(shipmentNum).padStart(2, '0')}`;
}

/**
 * Generate carrier tracking URL based on carrier and tracking number.
 */
function generateTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;

  const carrierUrls: Record<string, string> = {
    'australia post': `https://auspost.com.au/track/#!/details/${trackingNumber}`,
    auspost: `https://auspost.com.au/track/#!/details/${trackingNumber}`,
    startrack: `https://startrack.com.au/track/details/${trackingNumber}`,
    tnt: `https://www.tnt.com/express/en_au/site/tracking.html?searchType=con&cons=${trackingNumber}`,
    dhl: `https://www.dhl.com/au-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    sendle: `https://track.sendle.com/${trackingNumber}`,
    aramex: `https://www.aramex.com.au/track/shipments/${trackingNumber}`,
    'toll ipec': `https://www.tollgroup.com/tools/tracktrace?consignmentNumber=${trackingNumber}`,
    toll: `https://www.tollgroup.com/tools/tracktrace?consignmentNumber=${trackingNumber}`,
    couriers_please: `https://www.couriersplease.com.au/track/${trackingNumber}`,
  };

  const normalizedCarrier = carrier.toLowerCase().trim();
  return carrierUrls[normalizedCarrier] || null;
}

async function markShipmentAsShipped(
  ctx: Awaited<ReturnType<typeof withAuth>>,
  data: MarkShippedInput
): Promise<OrderShipment> {
  // Verify shipment exists and is pending
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

  // Create initial tracking event
  const trackingEvents: TrackingEvent[] = [
    {
      timestamp: shippedAt.toISOString(),
      status: 'Shipped',
      description: `Package picked up by ${data.carrier}`,
    },
  ];

  // Wrap shipment update and line item updates in a transaction
  const shipment = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
    );
    // Update shipment
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

    // Update line item qtyShipped and consume COGS from cost layers
    const items = await tx
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, data.id));

    // Lock ordering: sort by orderLineItemId for deterministic lock acquisition
    const sortedItems = [...items].sort((a, b) =>
      a.orderLineItemId.localeCompare(b.orderLineItemId)
    );

    const lineItemIds = sortedItems.map((i) => i.orderLineItemId);
    const allLineItems = lineItemIds.length > 0
      ? await tx
          .select({
            id: orderLineItems.id,
            productId: orderLineItems.productId,
            allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
          })
          .from(orderLineItems)
          .where(inArray(orderLineItems.id, lineItemIds))
      : [];
    const lineItemMap = new Map(allLineItems.map((li) => [li.id, li]));
    const canonicalAllocations = lineItemIds.length > 0
      ? await tx
          .select({
            lineItemId: orderLineSerialAllocations.orderLineItemId,
            serialNumber: serializedItems.serialNumberNormalized,
          })
          .from(orderLineSerialAllocations)
          .innerJoin(serializedItems, eq(orderLineSerialAllocations.serializedItemId, serializedItems.id))
          .where(
            and(
              eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
              eq(orderLineSerialAllocations.isActive, true),
              inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
            )
          )
      : [];
    const canonicalLineItemSerials = new Map<string, string[]>();
    for (const allocation of canonicalAllocations) {
      const existing = canonicalLineItemSerials.get(allocation.lineItemId) ?? [];
      existing.push(normalizeSerial(allocation.serialNumber));
      canonicalLineItemSerials.set(allocation.lineItemId, existing);
    }

    // Collect (productId, serialNumber) pairs for serialized items
    const serializedPairs: { productId: string; serialNumber: string }[] = [];
    const nonSerializedProductIds: string[] = [];
    for (const item of sortedItems) {
      const lineItem = lineItemMap.get(item.orderLineItemId);
      if (!lineItem?.productId) continue;
      const serials = ((item.serialNumbers as string[] | null) ?? []).map((sn) =>
        normalizeSerial(sn)
      );
      if (serials.length > 0) {
        for (const sn of serials) {
          serializedPairs.push({ productId: lineItem.productId, serialNumber: sn });
        }
      } else {
        nonSerializedProductIds.push(lineItem.productId);
      }
    }

    // Batch fetch serialized inventory: (productId, serialNumber) pairs
    let inventoryBySerialKey = new Map<string, typeof inventory.$inferSelect>();
    if (serializedPairs.length > 0) {
      const productIds = [...new Set(serializedPairs.map((p) => p.productId))];
      const serialNumbers = [...new Set(serializedPairs.map((p) => p.serialNumber))];
      const serializedInventory = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            inArray(inventory.productId, productIds),
            inArray(inventory.serialNumber, serialNumbers)
          )
        );
      for (const inv of serializedInventory) {
        if (inv.serialNumber) {
          inventoryBySerialKey.set(`${inv.productId}:${normalizeSerial(inv.serialNumber)}`, inv);
        }
      }
    }

    // Batch fetch non-serialized inventory (one per product for FIFO)
    let inventoryByProduct = new Map<string, typeof inventory.$inferSelect>();
    if (nonSerializedProductIds.length > 0) {
      const uniqueProductIds = [...new Set(nonSerializedProductIds)];
      const nonSerialInv = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            inArray(inventory.productId, uniqueProductIds)
          )
        );
      for (const inv of nonSerialInv) {
        if (!inventoryByProduct.has(inv.productId)) {
          inventoryByProduct.set(inv.productId, inv);
        }
      }
    }

    for (const item of sortedItems) {
      const lineItem = lineItemMap.get(item.orderLineItemId);
      if (!lineItem?.productId) continue;

      // Update qtyShipped
      await tx
        .update(orderLineItems)
        .set({
          qtyShipped: sql`${orderLineItems.qtyShipped} + ${item.quantity}`,
        })
        .where(eq(orderLineItems.id, item.orderLineItemId));

      // Trim allocatedSerialNumbers when shipping serials
      const serials = ((item.serialNumbers as string[] | null) ?? []).map((sn) =>
        normalizeSerial(sn)
      );
      const duplicateSerials = findDuplicateSerials(serials);
      if (duplicateSerials.length > 0) {
        throw new ValidationError('Duplicate serial number', {
          serialNumbers: [
            `Duplicate serial number "${duplicateSerials[0]}" in shipment item ${item.orderLineItemId}`,
          ],
        });
      }
      if (serials.length > 0) {
        const currentAllocated =
          canonicalLineItemSerials.get(item.orderLineItemId) ??
          ((lineItem.allocatedSerialNumbers as string[] | null) ?? []).map((sn) => normalizeSerial(sn));
        const remaining = currentAllocated.filter((s) => !serials.includes(s));
        await tx
          .update(orderLineItems)
          .set({
            allocatedSerialNumbers: remaining.length > 0 ? remaining : null,
            updatedAt: new Date(),
          })
          .where(eq(orderLineItems.id, item.orderLineItemId));
      }

      if (serials.length > 0) {
        // Serialized: consume from specific inventory rows by serial
        const invRows = serials
          .map((sn) => inventoryBySerialKey.get(`${lineItem.productId}:${sn}`))
          .filter((inv): inv is NonNullable<typeof inv> => inv != null)
          .sort((a, b) => a.id.localeCompare(b.id));

        if (invRows.length !== serials.length) {
          const foundSerials = new Set(
            invRows
              .map((r) => r.serialNumber)
              .filter((sn): sn is string => typeof sn === 'string')
              .map((sn) => normalizeSerial(sn))
          );
          const missing = serials.find((s) => !foundSerials.has(s));
          throw new ValidationError('Serial not found in inventory', {
            serialNumbers: [
              `Serial "${missing ?? 'unknown'}" not found in inventory for this product`,
            ],
          });
        }

        let _totalCogs = 0;
        for (const inv of invRows) {
          const layerConsumption = await consumeLayersFIFO(tx, {
            organizationId: ctx.organizationId,
            inventoryId: inv.id,
            quantity: 1,
          });
          if (layerConsumption.quantityUnfulfilled > 0) {
            throw new ValidationError('Serialized shipment has missing cost layers', {
              serialNumbers: [
                `Serial "${inv.serialNumber ?? 'unknown'}" has no available cost layer`,
              ],
              code: ['insufficient_cost_layers'],
            });
          }
          const unitCogs = layerConsumption.totalCost;
          _totalCogs += unitCogs;

          await tx.insert(inventoryMovements).values({
            organizationId: ctx.organizationId,
            inventoryId: inv.id,
            productId: lineItem.productId,
            locationId: inv.locationId,
            movementType: 'ship',
            quantity: -1,
            previousQuantity: Number(inv.quantityOnHand),
            newQuantity: Number(inv.quantityOnHand) - 1,
            unitCost: unitCogs,
            totalCost: unitCogs,
            referenceType: 'order',
            referenceId: existing.orderId,
            metadata: {
              shipmentId: data.id,
              cogsTotal: unitCogs,
              cogsUnitCost: unitCogs,
            },
            notes: `Shipped via ${updatedShipment.shipmentNumber}`,
            createdBy: ctx.user.id,
          });

          await tx
            .update(inventory)
            .set({
              quantityOnHand: sql`${inventory.quantityOnHand} - 1`,
              updatedBy: ctx.user.id,
            })
            .where(eq(inventory.id, inv.id));
          await recomputeInventoryValueFromLayers(tx, {
            organizationId: ctx.organizationId,
            inventoryId: inv.id,
            userId: ctx.user.id,
          });
          if (!inv.serialNumber) {
            throw new ValidationError('Serialized shipment inventory row is missing serial identity', {
              serialNumbers: ['Shipment cannot proceed for serialized rows without serial identity'],
              code: ['serialized_unit_violation'],
            });
          }
          await assertSerializedInventoryCostIntegrity(tx, {
            organizationId: ctx.organizationId,
            inventoryId: inv.id,
            serialNumber: inv.serialNumber,
            expectedQuantityOnHand: 0,
          });

          const existingSerializedItem =
            inv.serialNumber
              ? await findSerializedItemBySerial(tx, ctx.organizationId, inv.serialNumber, {
                  userId: ctx.user.id,
                  productId: lineItem.productId,
                  inventoryId: inv.id,
                  source: 'order_shipment_mark_shipped',
                })
              : null;
          const upsertedSerializedItemId =
            !existingSerializedItem && inv.serialNumber
              ? await upsertSerializedItemForInventory(tx, {
                  organizationId: ctx.organizationId,
                  productId: lineItem.productId,
                  serialNumber: inv.serialNumber,
                  inventoryId: inv.id,
                  userId: ctx.user.id,
                })
              : null;
          const serializedItem = existingSerializedItem ?? (upsertedSerializedItemId
            ? { id: upsertedSerializedItemId }
            : null);
          if (serializedItem) {
            await releaseSerializedItemAllocation(tx, {
              organizationId: ctx.organizationId,
              serializedItemId: serializedItem.id,
              userId: ctx.user.id,
            });
            await linkSerializedItemToShipmentItem(tx, {
              organizationId: ctx.organizationId,
              shipmentItemId: item.id,
              serializedItemId: serializedItem.id,
              userId: ctx.user.id,
            });
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId: serializedItem.id,
              eventType: 'shipped',
              entityType: 'shipment_item',
              entityId: item.id,
              notes: `Shipped via ${updatedShipment.shipmentNumber}`,
              userId: ctx.user.id,
            });
          }
        }

        if (invRows.length > 0) {
          const firstInv = invRows[0];
          const activeLayers = await tx
            .select({
              quantityRemaining: inventoryCostLayers.quantityRemaining,
              unitCost: inventoryCostLayers.unitCost,
            })
            .from(inventoryCostLayers)
            .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
            .where(
              and(
                eq(inventory.productId, lineItem.productId),
                eq(inventory.organizationId, ctx.organizationId),
                eq(inventory.locationId, firstInv.locationId),
                sql`${inventoryCostLayers.quantityRemaining} > 0`
              )
            );

          if (activeLayers.length > 0) {
            const totalRem = activeLayers.reduce((s, l) => s + l.quantityRemaining, 0);
            const totalVal = activeLayers.reduce(
              (s, l) => s + l.quantityRemaining * Number(l.unitCost),
              0
            );
            const avgCost = totalRem > 0 ? totalVal / totalRem : 0;
            await tx
              .update(products)
              .set({ costPrice: avgCost })
              .where(eq(products.id, lineItem.productId));
          }
        }
      } else {
        // Non-serialized: original FIFO logic
        const inv = inventoryByProduct.get(lineItem.productId);
        if (!inv) continue;

        const layerConsumption = await consumeLayersFIFO(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          quantity: item.quantity,
        });
        if (layerConsumption.quantityUnfulfilled > 0) {
          throw new ValidationError('Shipment has missing cost layers', {
            quantity: [
              `Unable to consume ${item.quantity} units from cost layers (missing ${layerConsumption.quantityUnfulfilled})`,
            ],
            code: ['insufficient_cost_layers'],
          });
        }
        const totalCogs = layerConsumption.totalCost;

        const cogsUnitCost = item.quantity > 0 ? totalCogs / item.quantity : 0;

        await tx.insert(inventoryMovements).values({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: lineItem.productId,
          locationId: inv.locationId,
          movementType: 'ship',
          quantity: -item.quantity,
          previousQuantity: Number(inv.quantityOnHand),
          newQuantity: Number(inv.quantityOnHand) - item.quantity,
          unitCost: cogsUnitCost,
          totalCost: totalCogs,
          referenceType: 'order',
          referenceId: existing.orderId,
          metadata: {
            shipmentId: data.id,
            cogsTotal: totalCogs,
            cogsUnitCost,
          },
          notes: `Shipped via ${updatedShipment.shipmentNumber}`,
          createdBy: ctx.user.id,
        });

        await tx
          .update(inventory)
          .set({
            quantityOnHand: sql`${inventory.quantityOnHand} - ${item.quantity}`,
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, inv.id));
        await recomputeInventoryValueFromLayers(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          userId: ctx.user.id,
        });

        const activeLayers = await tx
          .select({
            quantityRemaining: inventoryCostLayers.quantityRemaining,
            unitCost: inventoryCostLayers.unitCost,
          })
          .from(inventoryCostLayers)
          .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
          .where(
            and(
              eq(inventory.productId, lineItem.productId),
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.locationId, inv.locationId),
              sql`${inventoryCostLayers.quantityRemaining} > 0`
            )
          );

        if (activeLayers.length > 0) {
          const totalRem = activeLayers.reduce((s, l) => s + l.quantityRemaining, 0);
          const totalVal = activeLayers.reduce(
            (s, l) => s + l.quantityRemaining * Number(l.unitCost),
            0
          );
          const avgCost = totalRem > 0 ? totalVal / totalRem : 0;
          await tx
            .update(products)
            .set({ costPrice: avgCost })
            .where(eq(products.id, lineItem.productId));
        }
      }
    }

    // Auto-advance order status based on fulfillment state (inside transaction)
    // Check if all line items are fully shipped
    const orderLineItemsForStatus = await tx
      .select({
        quantity: orderLineItems.quantity,
        qtyShipped: orderLineItems.qtyShipped,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, existing.orderId));

    const totalOrdered = orderLineItemsForStatus.reduce((s, li) => s + li.quantity, 0);
    const totalShipped = orderLineItemsForStatus.reduce((s, li) => s + (li.qtyShipped ?? 0), 0);

    if (totalOrdered > 0 && totalShipped > 0) {
      const newOrderStatus = totalShipped >= totalOrdered ? 'shipped' : 'partially_shipped';

      // Only advance if current status allows it
      const [currentOrder] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, existing.orderId))
        .limit(1);

      const advanceable = ['picked', 'partially_shipped'];
      if (currentOrder && advanceable.includes(currentOrder.status)) {
        await tx
          .update(orders)
          .set({
            status: newOrderStatus,
            shippedDate: new Date().toISOString().slice(0, 10),
            updatedBy: ctx.user.id,
          })
          .where(eq(orders.id, existing.orderId));
      }
    }

    return updatedShipment;
  });

  return shipment;
}

interface ValidateShipmentItem {
  orderLineItemId: string;
  quantity: number;
  serialNumbers?: string[];
}

/**
 * Validate that all items belong to the order, have sufficient quantity,
 * and for serialized products: serialNumbers match quantity and are in allocatedSerialNumbers.
 */
async function validateShipmentItems(
  organizationId: string,
  orderId: string,
  items: ValidateShipmentItem[]
): Promise<void> {
  if (items.length === 0) return;

  const lineItemIds = items.map((i) => i.orderLineItemId);

  // Batch fetch line items with product isSerialized and allocatedSerialNumbers
  const rows = await db
    .select({
      lineItemId: orderLineItems.id,
      productId: orderLineItems.productId,
      quantity: orderLineItems.quantity,
      qtyShipped: orderLineItems.qtyShipped,
      description: orderLineItems.description,
      allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
      isSerialized: products.isSerialized,
    })
    .from(orderLineItems)
    .leftJoin(products, and(
      eq(orderLineItems.productId, products.id),
      eq(products.organizationId, organizationId),
      isNull(products.deletedAt)
    ))
    .where(
      and(
        inArray(orderLineItems.id, lineItemIds),
        eq(orderLineItems.organizationId, organizationId),
        eq(orderLineItems.orderId, orderId)
      )
    );

  const lineItemMap = new Map(
    rows.map((r) => [
      r.lineItemId,
      {
        productId: r.productId,
        quantity: r.quantity,
        qtyShipped: r.qtyShipped,
        description: r.description,
        allocatedSerialNumbers: (r.allocatedSerialNumbers as string[] | null) ?? [],
        isSerialized: r.isSerialized ?? false,
      },
    ])
  );
  const canonicalAllocations = lineItemIds.length > 0
    ? await db
        .select({
          lineItemId: orderLineSerialAllocations.orderLineItemId,
          serialNumber: serializedItems.serialNumberNormalized,
        })
        .from(orderLineSerialAllocations)
        .innerJoin(serializedItems, eq(orderLineSerialAllocations.serializedItemId, serializedItems.id))
        .where(
          and(
            eq(orderLineSerialAllocations.organizationId, organizationId),
            eq(orderLineSerialAllocations.isActive, true),
            inArray(orderLineSerialAllocations.orderLineItemId, lineItemIds)
          )
        )
    : [];
  const canonicalLineItemSerials = new Map<string, string[]>();
  for (const allocation of canonicalAllocations) {
    const existing = canonicalLineItemSerials.get(allocation.lineItemId) ?? [];
    existing.push(normalizeSerial(allocation.serialNumber));
    canonicalLineItemSerials.set(allocation.lineItemId, existing);
  }

  for (const item of items) {
    const lineData = lineItemMap.get(item.orderLineItemId);

    if (!lineData) {
      throw new ValidationError("Line item not found or doesn't belong to order", {
        [item.orderLineItemId]: ['Line item not found'],
      });
    }

    // Check available quantity (ordered - already shipped)
    const available = Number(lineData.quantity) - Number(lineData.qtyShipped ?? 0);
    if (item.quantity > available) {
      throw new ValidationError('Insufficient quantity available for shipment', {
        [item.orderLineItemId]: [`Only ${available} units available, requested ${item.quantity}`],
      });
    }

    // Validate serialized products: serialNumbers required, length === quantity, each in allocated
    if (lineData.isSerialized && item.quantity > 0) {
      const rawSerials = item.serialNumbers ?? [];
      const serials = rawSerials.map((s) => normalizeSerial(s));
      const emptyIndex = serials.findIndex((s) => s === '');
      if (emptyIndex >= 0) {
        throw new ValidationError('Invalid serial number', {
          [item.orderLineItemId]: [`Serial number at position ${emptyIndex + 1} is empty after trimming`],
        });
      }
      if (serials.length === 0) {
        throw new ValidationError('Serial numbers required for serialized product', {
          [item.orderLineItemId]: [
            `"${lineData.description}" requires ${item.quantity} serial number${item.quantity !== 1 ? 's' : ''}`,
          ],
        });
      }
      if (serials.length !== item.quantity) {
        throw new ValidationError('Serial number count mismatch', {
          [item.orderLineItemId]: [
            `Expected ${item.quantity} serial number${item.quantity !== 1 ? 's' : ''} for "${lineData.description}", got ${serials.length}`,
          ],
        });
      }
      const duplicates = findDuplicateSerials(serials);
      if (duplicates.length > 0) {
        throw new ValidationError('Duplicate serial number', {
          [item.orderLineItemId]: [
            `Duplicate serial number "${duplicates[0]}" in shipment item`,
          ],
        });
      }
      const allocatedSet = new Set(
        (
          canonicalLineItemSerials.get(item.orderLineItemId) ??
          lineData.allocatedSerialNumbers.map((sn) => normalizeSerial(sn))
        ).map((sn) => normalizeSerial(sn))
      );
      for (const sn of serials) {
        if (!allocatedSet.has(sn)) {
          throw new ValidationError('Serial number not allocated to this line item', {
            [item.orderLineItemId]: [`Serial number "${sn}" is not allocated to "${lineData.description}"`],
          });
        }
      }
    }
  }
}

// ============================================================================
// LIST SHIPMENTS
// ============================================================================

export const listShipments = createServerFn({ method: 'GET' })
  .inputValidator(shipmentListQuerySchema)
  .handler(async ({ data }): Promise<ListShipmentsResult> => {
    const ctx = await withAuth();
    const { orderId, status, carrier, dateFrom, dateTo, page, pageSize, sortBy, sortOrder } = data;

    // Build conditions
    const conditions = [eq(orderShipments.organizationId, ctx.organizationId)];

    if (orderId) {
      conditions.push(eq(orderShipments.orderId, orderId));
    }
    if (status) {
      conditions.push(eq(orderShipments.status, status));
    }
    if (carrier) {
      conditions.push(ilike(orderShipments.carrier, containsPattern(carrier)));
    }
    if (dateFrom) {
      conditions.push(gte(orderShipments.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(orderShipments.createdAt, dateTo));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderShipments)
      .where(and(...conditions));

    const total = count || 0;

    // Sort
    const sortColumn = {
      createdAt: orderShipments.createdAt,
      shippedAt: orderShipments.shippedAt,
      deliveredAt: orderShipments.deliveredAt,
      status: orderShipments.status,
    }[sortBy];

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Fetch shipments
    const shipments = await db
      .select()
      .from(orderShipments)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      shipments,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  });

/**
 * List shipments with cursor pagination (recommended for large datasets).
 */
export const listShipmentsCursor = createServerFn({ method: 'GET' })
  .inputValidator(shipmentListCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', orderId, status, carrier, dateFrom, dateTo } = data;

    const conditions = [eq(orderShipments.organizationId, ctx.organizationId)];
    if (orderId) conditions.push(eq(orderShipments.orderId, orderId));
    if (status) conditions.push(eq(orderShipments.status, status));
    if (carrier) conditions.push(ilike(orderShipments.carrier, containsPattern(carrier)));
    if (dateFrom) conditions.push(gte(orderShipments.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(orderShipments.createdAt, dateTo));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(orderShipments.createdAt, orderShipments.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const shipments = await db
      .select()
      .from(orderShipments)
      .where(and(...conditions))
      .orderBy(orderDir(orderShipments.createdAt), orderDir(orderShipments.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(shipments, pageSize);
  });

// ============================================================================
// GET SHIPMENT
// ============================================================================

export const getShipment = createServerFn({ method: 'GET' })
  .inputValidator(shipmentParamsSchema)
  .handler(async ({ data }): Promise<ShipmentWithItems> => {
    const ctx = await withAuth();

    const [shipment] = await db
      .select()
      .from(orderShipments)
      .where(
        and(eq(orderShipments.id, data.id), eq(orderShipments.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    // Get items
    const items = await db
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, data.id));

    return {
      ...shipment,
      items,
    };
  });

// ============================================================================
// CREATE SHIPMENT
// ============================================================================

export const createShipment = createServerFn({ method: 'POST' })
  .inputValidator(createShipmentSchema)
  .handler(async ({ data }): Promise<ShipmentWithItems> => {
    const ctx = await withAuth();

    // Verify order exists and belongs to org
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
      throw new NotFoundError('Order not found');
    }

    // Normalize serial numbers (trim whitespace from barcode scanners / paste)
    const normalizedItems = data.items.map((item) => ({
      ...item,
      serialNumbers: item.serialNumbers?.map((s) => normalizeSerial(s)) ?? undefined,
    }));

    // Validate items (uses normalized serials)
    await validateShipmentItems(ctx.organizationId, data.orderId, normalizedItems);

    // Generate shipment number
    const shipmentNumber =
      data.shipmentNumber || (await generateShipmentNumber(ctx.organizationId, data.orderId));

    // Generate tracking URL if carrier and tracking number provided
    const trackingUrl =
      data.trackingUrl || generateTrackingUrl(data.carrier ?? null, data.trackingNumber ?? null);

    // Wrap shipment creation and item insertion in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Create shipment
      const [shipment] = await tx
        .insert(orderShipments)
        .values({
          organizationId: ctx.organizationId,
          orderId: data.orderId,
          shipmentNumber,
          status: 'pending',
          carrier: data.carrier,
          carrierService: data.carrierService,
          trackingNumber: data.trackingNumber,
          trackingUrl,
          shippingAddress: data.shippingAddress,
          returnAddress: data.returnAddress,
          weight: data.weight,
          length: data.length,
          width: data.width,
          height: data.height,
          packageCount: data.packageCount,
          estimatedDeliveryAt: data.estimatedDeliveryAt,
          shippingCost: data.shippingCost,
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Batch-insert all shipment items at once (use normalized items)
      const createdItems = await tx
        .insert(shipmentItems)
        .values(
          normalizedItems.map((item) => ({
            organizationId: ctx.organizationId,
            shipmentId: shipment.id,
            orderLineItemId: item.orderLineItemId,
            quantity: item.quantity,
            serialNumbers: item.serialNumbers,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            notes: item.notes,
          }))
        )
        .returning();

      return {
        ...shipment,
        items: createdItems,
      };
    });

    return result;
  });

// ============================================================================
// UPDATE SHIPMENT
// ============================================================================

export const updateShipment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      ...updateShipmentSchema.shape,
    })
  )
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();
    const { id, ...updateData } = data;

    // Verify shipment exists
    const [existing] = await db
      .select()
      .from(orderShipments)
      .where(and(eq(orderShipments.id, id), eq(orderShipments.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Shipment not found');
    }

    // Cannot update delivered or returned shipments
    if (existing.status === 'delivered' || existing.status === 'returned') {
      throw new ValidationError('Cannot update completed shipment', {
        status: [`Shipment is ${existing.status}`],
      });
    }

    // Generate tracking URL if carrier or tracking number changed
    const trackingUrl =
      updateData.trackingUrl ||
      generateTrackingUrl(
        updateData.carrier ?? existing.carrier,
        updateData.trackingNumber ?? existing.trackingNumber
      );

    const [shipment] = await db
      .update(orderShipments)
      .set({
        ...updateData,
        trackingUrl,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderShipments.id, id))
      .returning();

    return shipment;
  });

// ============================================================================
// MARK AS SHIPPED
// ============================================================================

export const markShipped = createServerFn({ method: 'POST' })
  .inputValidator(markShippedSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<OrderShipment>> => {
    const ctx = await withAuth();
    const shipment = await markShipmentAsShipped(ctx, data);
    return serializedMutationSuccess(shipment, 'Shipment marked as shipped.', {
      affectedIds: [shipment.id],
    });
  });

// ============================================================================
// FULFILLMENT IMPORT
// ============================================================================

export const importFulfillmentShipments = createServerFn({ method: 'POST' })
  .inputValidator(fulfillmentImportSchema)
  .handler(async ({ data }) => {
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

    // Batch-fetch all orders by orderNumber upfront to avoid N+1 queries
    const uniqueOrderNumbers = [...new Set(data.rows.map((r) => r.orderNumber))];
    const allOrders = uniqueOrderNumbers.length > 0
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
    const orderByNumber = new Map(allOrders.map((o) => [o.orderNumber, o]));

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
  });

// ============================================================================
// UPDATE SHIPMENT STATUS
// ============================================================================

export const updateShipmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateShipmentStatusSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<OrderShipment>> => {
    const ctx = await withAuth();
    const transitionName = 'shipment_status_update';
    const idempotencyKey = data.idempotencyKey?.trim();

    // Verify shipment exists
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

    // Idempotent retry safety: same requested status returns current shipment.
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

    // Validate status transition
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      pending: ['in_transit', 'failed'],
      in_transit: ['out_for_delivery', 'delivered', 'failed', 'returned'],
      out_for_delivery: ['delivered', 'failed', 'returned'],
      delivered: [], // Terminal state
      failed: ['in_transit', 'returned'],
      returned: [], // Terminal state
    };

    if (!validTransitions[existing.status].includes(data.status)) {
      throw new ValidationError('Invalid status transition', {
        status: [`Cannot transition from ${existing.status} to ${data.status}`],
        code: ['transition_blocked'],
      });
    }

    // Add tracking event
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

    // Build update
    const updateValues: Partial<typeof orderShipments.$inferInsert> = {
      status: data.status,
      trackingEvents,
      updatedBy: ctx.user.id,
    };

    // Handle delivery — wrap line item updates + shipment update in a transaction
    if (data.status === 'delivered') {
      updateValues.deliveredAt = new Date();
      if (data.deliveryConfirmation) {
        updateValues.deliveryConfirmation = data.deliveryConfirmation;
      }

      const shipment = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
        );
        // Update line item qtyDelivered in batch
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
  });

// ============================================================================
// CONFIRM DELIVERY
// ============================================================================

export const confirmDelivery = createServerFn({ method: 'POST' })
  .inputValidator(confirmDeliverySchema)
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists and is in deliverable status
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

    if (!['in_transit', 'out_for_delivery'].includes(existing.status)) {
      throw new ValidationError('Shipment cannot be confirmed as delivered', {
        status: [`Current status is ${existing.status}`],
      });
    }

    const deliveredAt = data.deliveredAt || new Date();

    // Add tracking event
    const trackingEvents = [...(existing.trackingEvents || [])];
    trackingEvents.push({
      timestamp: deliveredAt.toISOString(),
      status: 'delivered',
      description: data.signedBy ? `Delivered and signed by ${data.signedBy}` : 'Delivered',
    });

    // Wrap shipment update and line item updates in a transaction
    const shipment = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Update shipment
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

      // Update line item qtyDelivered
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

      return updatedShipment;
    });

    return shipment;
  });

// ============================================================================
// ADD TRACKING EVENT
// ============================================================================

export const addTrackingEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      shipmentId: z.string().uuid(),
      event: z.object({
        timestamp: z.string().datetime(),
        status: z.string().min(1).max(100),
        location: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
      }),
    })
  )
  .handler(async ({ data }): Promise<OrderShipment> => {
    const ctx = await withAuth();

    // Verify shipment exists
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

    // Add event
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
  });

// ============================================================================
// GET ORDER SHIPMENTS
// ============================================================================

export const getOrderShipments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ShipmentWithItems[]> => {
    const ctx = await withAuth();

    // Verify order exists
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, data.orderId), eq(orders.organizationId, ctx.organizationId)))
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const shipments = await db
      .select()
      .from(orderShipments)
      .where(
        and(
          eq(orderShipments.orderId, data.orderId),
          eq(orderShipments.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(orderShipments.createdAt))
      .limit(100);

    // Batch fetch all shipment items in a single query
    const shipmentIds = shipments.map((s) => s.id);
    const allItems = shipmentIds.length > 0
      ? await db
          .select()
          .from(shipmentItems)
          .where(inArray(shipmentItems.shipmentId, shipmentIds))
      : [];
    // Group items by shipmentId (reduce for ES2022 compatibility)
    type ShipmentItem = (typeof allItems)[number];
    const itemsByShipment = allItems.reduce<Map<string, ShipmentItem[]>>((acc, item) => {
      const key = item.shipmentId;
      const arr = acc.get(key);
      if (arr) arr.push(item);
      else acc.set(key, [item]);
      return acc;
    }, new Map());

    const result: ShipmentWithItems[] = shipments.map((shipment) => ({
      ...shipment,
      items: itemsByShipment.get(shipment.id) ?? [],
    }));

    return result;
  });

// ============================================================================
// DELETE SHIPMENT (only pending)
// ============================================================================

export const deleteShipment = createServerFn({ method: 'POST' })
  .inputValidator(shipmentParamsSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify shipment exists and is pending
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

    if (existing.status !== 'pending') {
      throw new ValidationError('Only pending shipments can be deleted', {
        status: [`Current status is ${existing.status}`],
      });
    }

    // Wrap both deletes in a transaction for atomicity
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Delete items first (cascade should handle this, but be explicit)
      await tx.delete(shipmentItems).where(eq(shipmentItems.shipmentId, data.id));

      // Delete shipment and verify it was actually deleted
      const [deleted] = await tx
        .delete(orderShipments)
        .where(eq(orderShipments.id, data.id))
        .returning({ id: orderShipments.id });

      if (!deleted) {
        throw new NotFoundError('Shipment not found or already deleted');
      }
    });

    return { success: true };
  });

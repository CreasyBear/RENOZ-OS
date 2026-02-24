'use server'

/**
 * Order Picking Server Functions
 *
 * Handles pick operations for order fulfillment.
 * Supports multi-round picking with serial number tracking.
 * Validates serial numbers against inventory for serialized products.
 *
 * @see src/lib/schemas/orders/picking.ts for validation schemas
 * @see drizzle/schema/orders/orders.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull, sql, inArray, not } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  orders,
  orderLineItems,
  inventory,
  products,
  orderLineSerialAllocations,
  serializedItems,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { pickOrderItemsSchema, unpickOrderItemsSchema } from '@/lib/schemas/orders/picking';
import type { OrderStatus } from '@/lib/schemas/orders';
import { findDuplicateSerials, normalizeSerial } from '@/lib/serials';
import {
  addSerializedItemEvent,
  allocateSerializedItemToOrderLine,
  findSerializedItemBySerial,
  releaseSerializedItemAllocation,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';

// ============================================================================
// PICK ORDER ITEMS
// ============================================================================

/** Order statuses where pick/unpick is allowed (before delivery). */
const PICK_UNPICK_ALLOWED_STATUSES: OrderStatus[] = [
  'confirmed',
  'picking',
  'picked',
  'partially_shipped',
  'shipped',
];

/**
 * Pick items from an order.
 *
 * Supports multi-round picking: serial numbers are merged (appended)
 * across pick rounds. Auto-advances order status based on pick progress.
 *
 * Guards:
 * - Order must be in a pre-delivery status (confirmed through shipped)
 * - Cannot over-pick (qtyPicked + new qty <= ordered quantity)
 * - Serial numbers must be unique within the order
 * - Serial numbers must exist in inventory for serialized products
 * - Serial numbers must not be allocated to other orders
 */
export const pickOrderItems = createServerFn({ method: 'POST' })
  .inputValidator(pickOrderItemsSchema)
  .handler(async ({ data }) => {
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
      throw new NotFoundError('Order not found', 'order');
    }

    // Guard: order must be in a pre-delivery status (pick/unpick freely until delivered)
    const currentStatus = order.status as OrderStatus;
    if (!PICK_UNPICK_ALLOWED_STATUSES.includes(currentStatus)) {
      throw new ValidationError('Order is not in a pickable status', {
        status: [
          `Order must be in a pre-delivery status (confirmed, picking, picked, partially_shipped, or shipped), currently '${currentStatus}'`,
        ],
      });
    }

    // Execute pick in a transaction
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get all line items for the order with product info
      // Select only the columns needed for pick validation and updates
      const allLineItems = await tx
        .select({
          lineItem: {
            id: orderLineItems.id,
            productId: orderLineItems.productId,
            quantity: orderLineItems.quantity,
            qtyPicked: orderLineItems.qtyPicked,
            description: orderLineItems.description,
            allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
          },
          product: {
            id: products.id,
            isSerialized: products.isSerialized,
          },
        })
        .from(orderLineItems)
        .leftJoin(products, and(
          eq(orderLineItems.productId, products.id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        ))
        .where(and(
          eq(orderLineItems.orderId, data.orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        ));

      const lineItemMap = new Map(allLineItems.map((li) => [li.lineItem.id, li]));
      const orderLineItemIds = allLineItems.map((li) => li.lineItem.id);

      const canonicalAllocations = orderLineItemIds.length > 0
        ? await tx
            .select({
              lineItemId: orderLineSerialAllocations.orderLineItemId,
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
                inArray(orderLineSerialAllocations.orderLineItemId, orderLineItemIds)
              )
            )
        : [];

      const canonicalLineSerials = new Map<string, string[]>();
      for (const allocation of canonicalAllocations) {
        const existing = canonicalLineSerials.get(allocation.lineItemId) ?? [];
        existing.push(normalizeSerial(allocation.serialNumber));
        canonicalLineSerials.set(allocation.lineItemId, existing);
      }

      // Collect all existing serial numbers in the order to validate uniqueness
      const existingSerials = new Set<string>();
      for (const { lineItem } of allLineItems) {
        const serials =
          canonicalLineSerials.get(lineItem.id) ??
          ((lineItem.allocatedSerialNumbers as string[] | null) ?? []).map((s) => normalizeSerial(s));
        if (serials) {
          serials.forEach((s) => existingSerials.add(normalizeSerial(s)));
        }
      }

      // Also collect all new serial numbers being submitted to validate uniqueness across items
      const newSerials = new Set<string>();
      for (const pickItem of data.items) {
        if (pickItem.serialNumbers) {
          const normalized = pickItem.serialNumbers.map((sn) => normalizeSerial(sn));
          const duplicates = findDuplicateSerials(normalized);
          if (duplicates.length > 0) {
            throw new ValidationError('Duplicate serial number', {
              serialNumbers: [`Serial number '${duplicates[0]}' appears multiple times in this pick`],
            });
          }
          for (const sn of normalized) {
            if (existingSerials.has(sn)) {
              throw new ValidationError('Duplicate serial number', {
                serialNumbers: [`Serial number '${sn}' is already allocated in this order`],
              });
            }
            if (newSerials.has(sn)) {
              throw new ValidationError('Duplicate serial number', {
                serialNumbers: [`Serial number '${sn}' appears multiple times in this pick`],
              });
            }
            newSerials.add(sn);
          }
        }
      }

      // Validate serial numbers exist in inventory and are available.
      // Canonical source for "allocated to other orders" is active allocations.
      const otherOrdersSerials = await tx
        .select({
          serialNumber: serializedItems.serialNumberNormalized,
        })
        .from(orderLineSerialAllocations)
        .innerJoin(
          serializedItems,
          eq(orderLineSerialAllocations.serializedItemId, serializedItems.id)
        )
        .innerJoin(
          orderLineItems,
          eq(orderLineSerialAllocations.orderLineItemId, orderLineItems.id)
        )
        .innerJoin(
          orders,
          and(
            eq(orderLineItems.orderId, orders.id),
            isNull(orders.deletedAt),
            not(inArray(orders.status, ['cancelled', 'delivered']))
          )
        )
        .where(
          and(
            eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
            eq(orderLineSerialAllocations.isActive, true),
            sql`${orderLineItems.orderId} != ${data.orderId}`
          )
        )
        .limit(10000);

      const allocatedSerials = new Set<string>();
      for (const row of otherOrdersSerials) {
        allocatedSerials.add(normalizeSerial(row.serialNumber));
      }

      // Process each pick item
      const updatedLineItems = [];
      for (const pickItem of data.items) {
        const lineItemData = lineItemMap.get(pickItem.lineItemId);
        if (!lineItemData) {
          throw new ValidationError('Line item not found', {
            lineItemId: [`Line item '${pickItem.lineItemId}' not found in order`],
          });
        }

        const { lineItem, product } = lineItemData;
        const isSerialized = product?.isSerialized ?? false;

        const currentPicked = Number(lineItem.qtyPicked) || 0;
        const orderedQty = Number(lineItem.quantity);
        const newTotal = currentPicked + pickItem.qtyPicked;

        if (newTotal > orderedQty) {
          throw new ValidationError('Over-picking not allowed', {
            qtyPicked: [
              `Cannot pick ${pickItem.qtyPicked} for '${lineItem.description}'. Already picked: ${currentPicked}, ordered: ${orderedQty}`,
            ],
          });
        }

        // Validate serialized products have serial numbers
        if (isSerialized && pickItem.qtyPicked > 0) {
          const rawSerials = pickItem.serialNumbers ?? [];
          const serialsToValidate = rawSerials.map((s) => normalizeSerial(s));
          const emptyIndex = serialsToValidate.findIndex((s) => s === '');
          if (emptyIndex >= 0) {
            throw new ValidationError('Invalid serial number', {
              serialNumbers: [`Serial number at position ${emptyIndex + 1} is empty after trimming`],
            });
          }
          if (serialsToValidate.length === 0) {
            throw new ValidationError('Serial numbers required', {
              serialNumbers: [`Product '${lineItem.description}' requires serial numbers for picking`],
            });
          }

          if (serialsToValidate.length !== pickItem.qtyPicked) {
            throw new ValidationError('Serial number count mismatch', {
              serialNumbers: [
                `Expected ${pickItem.qtyPicked} serial number(s) for '${lineItem.description}', got ${serialsToValidate.length}`,
              ],
            });
          }

          // Validate serial numbers: check allocations first, then batch validate in inventory
          for (const serialNumber of serialsToValidate) {
            if (allocatedSerials.has(serialNumber)) {
              throw new ValidationError('Serial number already allocated', {
                serialNumbers: [`Serial number '${serialNumber}' is already allocated to another order`],
              });
            }
          }

          // Batch fetch all inventory records for these serial numbers
          const inventoryRecords = await tx
            .select({
              id: inventory.id,
              serialNumber: inventory.serialNumber,
              status: inventory.status,
              quantityOnHand: inventory.quantityOnHand,
            })
            .from(inventory)
            .where(
              and(
                eq(inventory.organizationId, ctx.organizationId),
                eq(inventory.productId, lineItem.productId!),
                inArray(inventory.serialNumber, serialsToValidate),
                sql`${inventory.quantityOnHand} > 0`
              )
            );
          const inventoryBySerial = new Map(
            inventoryRecords
              .filter((r) => typeof r.serialNumber === 'string')
              .map((r) => [normalizeSerial(r.serialNumber as string), r] as const)
          );

          for (const serialNumber of serialsToValidate) {
            const inventoryRecord = inventoryBySerial.get(serialNumber);

            if (!inventoryRecord) {
              throw new ValidationError('Invalid serial number', {
                serialNumbers: [`Serial number '${serialNumber}' not found in inventory for product '${lineItem.description}'`],
              });
            }

            if (inventoryRecord.status === 'allocated') {
              throw new ValidationError('Serial number unavailable', {
                serialNumbers: [`Serial number '${serialNumber}' is already allocated`],
              });
            }
          }
        }

        // Merge serial numbers (use trimmed serials for storage)
        const existingItemSerials =
          canonicalLineSerials.get(lineItem.id) ??
          ((lineItem.allocatedSerialNumbers as string[] | null) ?? []).map((s) => normalizeSerial(s));
        const serialsToMerge = pickItem.serialNumbers?.map((s) => normalizeSerial(s));
        const mergedSerials = serialsToMerge && serialsToMerge.length > 0
          ? [...existingItemSerials, ...serialsToMerge]
          : existingItemSerials;

        // Determine pick status
        const pickStatus = newTotal >= orderedQty ? 'picked' : 'picking';

        const [updated] = await tx
          .update(orderLineItems)
          .set({
            qtyPicked: newTotal,
            pickStatus,
            pickedBy: ctx.user.id,
            pickedAt: new Date(),
            allocatedSerialNumbers: mergedSerials.length > 0 ? mergedSerials : null,
            updatedAt: new Date(),
          })
          .where(eq(orderLineItems.id, pickItem.lineItemId))
          .returning();

        updatedLineItems.push(updated);

        if (isSerialized && serialsToMerge && serialsToMerge.length > 0 && lineItem.productId) {
          for (const serialNumber of serialsToMerge) {
            const inventoryRecord = await tx
              .select({
                id: inventory.id,
                locationId: inventory.locationId,
              })
              .from(inventory)
              .where(
                and(
                  eq(inventory.organizationId, ctx.organizationId),
                  eq(inventory.productId, lineItem.productId),
                  eq(inventory.serialNumber, serialNumber)
                )
              )
              .limit(1)
              .then((rows) => rows[0]);

            if (!inventoryRecord) continue;

            const serializedItemId =
              (await findSerializedItemBySerial(tx, ctx.organizationId, serialNumber, {
                userId: ctx.user.id,
                productId: lineItem.productId,
                inventoryId: inventoryRecord.id,
                source: 'order_picking',
              }))?.id ??
              (await upsertSerializedItemForInventory(tx, {
                organizationId: ctx.organizationId,
                productId: lineItem.productId,
                serialNumber,
                inventoryId: inventoryRecord.id,
                userId: ctx.user.id,
              }));

            if (!serializedItemId) continue;

            await allocateSerializedItemToOrderLine(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              orderLineItemId: pickItem.lineItemId,
              userId: ctx.user.id,
            });
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              eventType: 'allocated',
              entityType: 'order_line_item',
              entityId: pickItem.lineItemId,
              notes: `Allocated during picking for order ${data.orderId}`,
              userId: ctx.user.id,
            });

            const updatedLineSerials = canonicalLineSerials.get(pickItem.lineItemId) ?? [];
            updatedLineSerials.push(serialNumber);
            canonicalLineSerials.set(pickItem.lineItemId, updatedLineSerials);
          }
        }
      }

      // Auto-advance order status
      // Re-read all line items to determine overall status
      const refreshedItems = await tx
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, data.orderId));

      const allFullyPicked = refreshedItems.every(
        (li) => Number(li.qtyPicked) >= Number(li.quantity)
      );
      const anyPicked = refreshedItems.some((li) => Number(li.qtyPicked) > 0);

      let newOrderStatus: OrderStatus;
      if (allFullyPicked) {
        newOrderStatus = 'picked';
      } else if (anyPicked) {
        newOrderStatus = 'picking';
      } else {
        newOrderStatus = currentStatus;
      }

      if (newOrderStatus !== currentStatus) {
        await tx
          .update(orders)
          .set({
            status: newOrderStatus,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(orders.id, data.orderId));
      }

      return {
        lineItems: updatedLineItems,
        orderStatus: newOrderStatus,
      };
    });

    return result;
  });

// ============================================================================
// UNPICK ORDER ITEMS
// ============================================================================

/**
 * Unpick items from an order.
 *
 * Reverses pick allocation: decrements qtyPicked, releases serial allocations.
 * Cannot unpick already-shipped units. Pick/unpick freely until delivery.
 *
 * Guards:
 * - Order must be in a pre-delivery status (confirmed through shipped)
 * - qtyToUnpick <= (qtyPicked - qtyShipped) per line
 * - For serialized: serialNumbersToRelease must be subset of allocatedSerialNumbers, or omit to unpick last N by FIFO
 */
export const unpickOrderItems = createServerFn({ method: 'POST' })
  .inputValidator(unpickOrderItemsSchema)
  .handler(async ({ data }) => {
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

    const currentStatus = order.status as OrderStatus;
    if (!PICK_UNPICK_ALLOWED_STATUSES.includes(currentStatus)) {
      throw new ValidationError('Order is not in an unpickable status', {
        status: [
          `Order must be in a pre-delivery status (confirmed, picking, picked, partially_shipped, or shipped), currently '${currentStatus}'`,
        ],
      });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const allLineItems = await tx
        .select({
          lineItem: {
            id: orderLineItems.id,
            productId: orderLineItems.productId,
            quantity: orderLineItems.quantity,
            qtyPicked: orderLineItems.qtyPicked,
            qtyShipped: orderLineItems.qtyShipped,
            description: orderLineItems.description,
            allocatedSerialNumbers: orderLineItems.allocatedSerialNumbers,
          },
          product: {
            id: products.id,
            isSerialized: products.isSerialized,
          },
        })
        .from(orderLineItems)
        .leftJoin(products, and(
          eq(orderLineItems.productId, products.id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        ))
        .where(and(
          eq(orderLineItems.orderId, data.orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        ));

      const lineItemMap = new Map(allLineItems.map((li) => [li.lineItem.id, li]));
      const orderLineItemIds = allLineItems.map((li) => li.lineItem.id);

      const canonicalAllocations = orderLineItemIds.length > 0
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
                eq(orderLineSerialAllocations.organizationId, ctx.organizationId),
                eq(orderLineSerialAllocations.isActive, true),
                inArray(orderLineSerialAllocations.orderLineItemId, orderLineItemIds)
              )
            )
        : [];

      const canonicalLineSerials = new Map<string, { serializedItemId: string; serialNumber: string }[]>();
      for (const alloc of canonicalAllocations) {
        const existing = canonicalLineSerials.get(alloc.lineItemId) ?? [];
        existing.push({ serializedItemId: alloc.serializedItemId, serialNumber: normalizeSerial(alloc.serialNumber) });
        canonicalLineSerials.set(alloc.lineItemId, existing);
      }

      const updatedLineItems = [];
      for (const unpickItem of data.items) {
        const lineItemData = lineItemMap.get(unpickItem.lineItemId);
        if (!lineItemData) {
          throw new ValidationError('Line item not found', {
            lineItemId: [`Line item '${unpickItem.lineItemId}' not found in order`],
          });
        }

        const { lineItem, product } = lineItemData;
        const isSerialized = product?.isSerialized ?? false;
        const currentPicked = Number(lineItem.qtyPicked) || 0;
        const currentShipped = Number(lineItem.qtyShipped) || 0;
        const maxUnpickable = Math.max(0, currentPicked - currentShipped);

        if (unpickItem.qtyToUnpick > maxUnpickable) {
          throw new ValidationError('Cannot unpick already-shipped units', {
            qtyToUnpick: [
              `Cannot unpick ${unpickItem.qtyToUnpick} for '${lineItem.description}'. Picked: ${currentPicked}, shipped: ${currentShipped}, max unpickable: ${maxUnpickable}`,
            ],
          });
        }

        const itemAllocationsRaw = canonicalLineSerials.get(unpickItem.lineItemId);
        const itemAllocations =
          itemAllocationsRaw && itemAllocationsRaw.length > 0
            ? itemAllocationsRaw
            : ((lineItem.allocatedSerialNumbers as string[] | null) ?? []).map((sn) => ({
                serializedItemId: '',
                serialNumber: normalizeSerial(sn),
              }));

        let serialsToRelease: string[];
        if (isSerialized && unpickItem.qtyToUnpick > 0) {
          if (unpickItem.serialNumbersToRelease && unpickItem.serialNumbersToRelease.length > 0) {
            const requested = unpickItem.serialNumbersToRelease.map((s) => normalizeSerial(s));
            const duplicates = findDuplicateSerials(requested);
            if (duplicates.length > 0) {
              throw new ValidationError('Duplicate serial number', {
                serialNumbersToRelease: [
                  `Serial number '${duplicates[0]}' appears multiple times in this unpick`,
                ],
              });
            }
            const allocatedSet = new Set(itemAllocations.map((a) => a.serialNumber));
            for (const sn of requested) {
              if (!allocatedSet.has(sn)) {
                throw new ValidationError('Serial number not allocated to this line', {
                  serialNumbersToRelease: [`Serial '${sn}' is not allocated to this line item`],
                });
              }
            }
            if (requested.length !== unpickItem.qtyToUnpick) {
              throw new ValidationError('Serial count mismatch', {
                serialNumbersToRelease: [
                  `Expected ${unpickItem.qtyToUnpick} serial(s) to release, got ${requested.length}`,
                ],
              });
            }
            serialsToRelease = requested;
          } else {
            const allocatedSerials = itemAllocations.map((a) => a.serialNumber);
            serialsToRelease = allocatedSerials.slice(-unpickItem.qtyToUnpick);
            if (serialsToRelease.length !== unpickItem.qtyToUnpick) {
              throw new ValidationError('Insufficient allocated serials', {
                serialNumbersToRelease: [
                  `Line has ${allocatedSerials.length} serial(s) allocated, need ${unpickItem.qtyToUnpick} to unpick`,
                ],
              });
            }
          }
        } else {
          serialsToRelease = [];
        }

        const newQtyPicked = currentPicked - unpickItem.qtyToUnpick;
        const orderedQty = Number(lineItem.quantity);
        const pickStatus = newQtyPicked >= orderedQty ? 'picked' : newQtyPicked > 0 ? 'picking' : 'not_picked';

        let newAllocatedSerials: string[] | null = null;
        if (isSerialized && itemAllocations.length > 0) {
          const currentSerials = itemAllocations.map((a) => a.serialNumber);
          const releaseSet = new Set(serialsToRelease);
          const remaining = currentSerials.filter((s) => !releaseSet.has(s));
          newAllocatedSerials = remaining.length > 0 ? remaining : null;
        }

        for (const sn of serialsToRelease) {
          let serializedItemId = itemAllocations.find((a) => a.serialNumber === sn)?.serializedItemId;
          if (!serializedItemId && lineItem.productId) {
            const [si] = await tx
              .select({ id: serializedItems.id })
              .from(serializedItems)
              .where(
                and(
                  eq(serializedItems.organizationId, ctx.organizationId),
                  eq(serializedItems.productId, lineItem.productId),
                  eq(serializedItems.serialNumberNormalized, sn)
                )
              )
              .limit(1);
            serializedItemId = si?.id;
          }
          if (serializedItemId) {
            await releaseSerializedItemAllocation(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              userId: ctx.user.id,
            });
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              eventType: 'deallocated',
              entityType: 'order_line_item',
              entityId: unpickItem.lineItemId,
              notes: `Unpicked from order ${data.orderId}`,
              userId: ctx.user.id,
            });
          }
        }

        const [updated] = await tx
          .update(orderLineItems)
          .set({
            qtyPicked: newQtyPicked,
            pickStatus,
            allocatedSerialNumbers: newAllocatedSerials,
            updatedAt: new Date(),
          })
          .where(eq(orderLineItems.id, unpickItem.lineItemId))
          .returning();

        updatedLineItems.push(updated);

        for (const sn of serialsToRelease) {
          const idx = itemAllocations.findIndex((a) => a.serialNumber === sn);
          if (idx >= 0) itemAllocations.splice(idx, 1);
        }
        canonicalLineSerials.set(unpickItem.lineItemId, itemAllocations);
      }

      const refreshedItems = await tx
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, data.orderId));

      const allFullyPicked = refreshedItems.every(
        (li) => Number(li.qtyPicked) >= Number(li.quantity)
      );
      const anyPicked = refreshedItems.some((li) => Number(li.qtyPicked) > 0);

      let newOrderStatus: OrderStatus;
      if (allFullyPicked) {
        newOrderStatus = 'picked';
      } else if (anyPicked) {
        newOrderStatus = 'picking';
      } else {
        newOrderStatus = 'confirmed';
      }

      if (newOrderStatus !== currentStatus) {
        await tx
          .update(orders)
          .set({
            status: newOrderStatus,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(orders.id, data.orderId));
      }

      return {
        lineItems: updatedLineItems,
        orderStatus: newOrderStatus,
      };
    });

    return result;
  });

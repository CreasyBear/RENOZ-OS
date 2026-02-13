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
import { orders, orderLineItems, inventory, products } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { pickOrderItemsSchema } from '@/lib/schemas/orders/picking';
import type { OrderStatus } from '@/lib/schemas/orders';

// ============================================================================
// PICK ORDER ITEMS
// ============================================================================

/**
 * Pick items from an order.
 *
 * Supports multi-round picking: serial numbers are merged (appended)
 * across pick rounds. Auto-advances order status based on pick progress.
 *
 * Guards:
 * - Order must be in 'confirmed' or 'picking' status
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

    // Guard: order must be in a pickable status
    const currentStatus = order.status as OrderStatus;
    if (currentStatus !== 'confirmed' && currentStatus !== 'picking') {
      throw new ValidationError('Order is not in a pickable status', {
        status: [`Order must be in 'confirmed' or 'picking' status, currently '${currentStatus}'`],
      });
    }

    // Execute pick in a transaction
    const result = await db.transaction(async (tx) => {
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

      // Collect all existing serial numbers in the order to validate uniqueness
      const existingSerials = new Set<string>();
      for (const { lineItem } of allLineItems) {
        const serials = lineItem.allocatedSerialNumbers as string[] | null;
        if (serials) {
          serials.forEach((s) => existingSerials.add(s));
        }
      }

      // Also collect all new serial numbers being submitted to validate uniqueness across items
      const newSerials = new Set<string>();
      for (const pickItem of data.items) {
        if (pickItem.serialNumbers) {
          for (const sn of pickItem.serialNumbers) {
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

      // Validate serial numbers exist in inventory and are available
      // Get all serials currently allocated to other active orders
      const otherOrdersSerials = await tx
        .select({
          serialNumbers: orderLineItems.allocatedSerialNumbers,
        })
        .from(orderLineItems)
        .innerJoin(orders, and(
          eq(orderLineItems.orderId, orders.id),
          isNull(orders.deletedAt),
          // Only check active orders (not cancelled or delivered)
          not(inArray(orders.status, ['cancelled', 'delivered']))
        ))
        .where(
          and(
            eq(orderLineItems.organizationId, ctx.organizationId),
            sql`${orderLineItems.orderId} != ${data.orderId}`,
            sql`${orderLineItems.allocatedSerialNumbers} IS NOT NULL`
          )
        )
        .limit(10000);

      const allocatedSerials = new Set<string>();
      for (const row of otherOrdersSerials) {
        const serials = row.serialNumbers as string[] | null;
        if (serials) {
          serials.forEach((s) => allocatedSerials.add(s));
        }
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
          const serialsToValidate = rawSerials.map((s) => s.trim());
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
          const inventoryBySerial = new Map(inventoryRecords.map((r) => [r.serialNumber, r]));

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
        const existingItemSerials = (lineItem.allocatedSerialNumbers as string[] | null) ?? [];
        const serialsToMerge = pickItem.serialNumbers?.map((s) => s.trim());
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

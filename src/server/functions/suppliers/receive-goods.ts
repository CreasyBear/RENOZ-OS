/**
 * Goods Receipt Server Functions
 *
 * Core transactional function for receiving goods against a purchase order.
 * Creates receipts, inventory movements, cost layers, and updates balances.
 *
 * @see drizzle/schema/suppliers/purchase-order-receipts.ts
 * @see drizzle/schema/inventory/inventory.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, asc, inArray, isNull, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  purchaseOrders,
  purchaseOrderItems,
  purchaseOrderReceipts,
  purchaseOrderReceiptItems,
  purchaseOrderCosts,
} from 'drizzle/schema/suppliers';
import { organizations } from 'drizzle/schema/settings/organizations';
import {
  inventory,
  inventoryMovements,
  inventoryCostLayers,
} from 'drizzle/schema/inventory/inventory';
import { warehouseLocations } from 'drizzle/schema/inventory/warehouse-locations';
import { products } from 'drizzle/schema/products/products';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { normalizeSerial, hasDuplicateSerials } from '@/lib/serials';
import { allocateCosts, type AllocationItem } from './cost-allocation';
import { unitPriceToOrgCurrency } from './receive-goods-utils';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  createSerializedMutationError,
  serializedMutationSuccess,
  type SerializedMutationEnvelope,
} from '@/lib/server/serialized-mutation-contract';
import {
  assertSerializedInventoryCostIntegrity,
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  buildProductSerializationRequirementMap,
  getUniqueReceiptProductIds,
} from './receive-goods-serialization';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const receiveGoodsItemSchema = z.object({
  poItemId: z.string().uuid(),
  quantityReceived: z.number().int().min(1),
  quantityRejected: z.number().int().min(0).default(0),
  condition: z.enum(['new', 'refurbished', 'used', 'damaged']).default('new'),
  rejectionReason: z.enum([
    'damaged',
    'wrong_item',
    'quality_issue',
    'short_shipment',
    'other',
  ]).optional(),
  lotNumber: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  deliveryReference: z.string().optional(),
  items: z.array(receiveGoodsItemSchema).min(1),
});

const listReceiptsSchema = normalizeObjectInput(
  z.object({
    purchaseOrderId: z.string().uuid(),
  })
);

interface ReceiveGoodsMutationPayload {
  receipt: typeof purchaseOrderReceipts.$inferSelect;
  movementIds: string[];
  newPOStatus: (typeof purchaseOrders.$inferSelect)['status'];
}

// ============================================================================
// RECEIVE GOODS (Transactional)
// ============================================================================

/**
 * Receive goods against a purchase order.
 *
 * This is a single database transaction that:
 * 1. Creates a receipt header
 * 2. Creates receipt line items
 * 3. Calculates landed cost per item (unit price + allocated PO costs)
 * 4. Creates inventory movements (type: purchase_in)
 * 5. Creates cost layers (FIFO, reference_type: purchase_order)
 * 6. Updates inventory balances (quantityOnHand, unitCost via weighted average)
 * 7. Updates PO item quantityReceived / quantityPending
 * 8. Updates PO status (partial_received or received)
 * 9. Updates product costPrice with new weighted average
 */
export const receiveGoods = createServerFn({ method: 'POST' })
  .inputValidator(receiveGoodsSchema)
  .handler(async ({ data }): Promise<SerializedMutationEnvelope<ReceiveGoodsMutationPayload>> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // -----------------------------------------------------------------------
      // 1. Validate PO exists and is in a receivable status
      // -----------------------------------------------------------------------
      const [po] = await tx
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, data.purchaseOrderId),
            eq(purchaseOrders.organizationId, ctx.organizationId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .limit(1);

      if (!po) {
        throw new NotFoundError('Purchase order not found', 'purchaseOrder');
      }

      if (!['ordered', 'partial_received'].includes(po.status)) {
        throw createSerializedMutationError(
          `Cannot receive goods for a purchase order with status "${po.status}". Must be "ordered" or "partial_received".`,
          'transition_blocked'
        );
      }

      // Fetch org currency for multi-currency conversion
      const [org] = await tx
        .select({ currency: organizations.currency })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId))
        .limit(1);
      const orgCurrency = org?.currency ?? 'AUD';

      // Validate exchange rate when PO currency differs from org currency
      const poCurrency = po.currency ?? 'AUD';
      if (poCurrency !== orgCurrency) {
        const exchangeRate = po.exchangeRate != null ? Number(po.exchangeRate) : null;
        if (exchangeRate == null || exchangeRate <= 0) {
          throw new ValidationError(
            `Purchase order currency (${poCurrency}) differs from organization currency (${orgCurrency}). Set exchange rate on the purchase order before receiving goods.`
          );
        }
      }

      // -----------------------------------------------------------------------
      // 2. Get PO items and validate quantities
      // -----------------------------------------------------------------------
      const poItems = await tx
        .select()
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId),
            eq(purchaseOrderItems.organizationId, ctx.organizationId)
          )
        )
        .orderBy(asc(purchaseOrderItems.lineNumber))
        .for('update');

      const poItemMap = new Map(poItems.map((item) => [item.id, item]));
      const serialsSeenInRequest = new Set<string>();
      const productIds = getUniqueReceiptProductIds(
        poItems.map((item) => item.productId)
      );
      let productSerializationMap = new Map<string, boolean>();
      if (productIds.length > 0) {
        const productRows = await tx
          .select({ id: products.id, isSerialized: products.isSerialized })
          .from(products)
          .where(
            and(
              eq(products.organizationId, ctx.organizationId),
              inArray(products.id, productIds),
              eq(products.status, 'active'),
              eq(products.isActive, true),
              eq(products.isPurchasable, true),
              isNull(products.deletedAt)
            )
          );
        productSerializationMap = buildProductSerializationRequirementMap(
          productIds,
          productRows
        );
      }

      // Validate all receipt items reference valid PO items
      for (const receiptItem of data.items) {
        const poItem = poItemMap.get(receiptItem.poItemId);
        if (!poItem) {
          throw new ValidationError(`PO item ${receiptItem.poItemId} not found`);
        }

        const totalReceiving = receiptItem.quantityReceived + receiptItem.quantityRejected;
        const maxReceivable = poItem.quantity - poItem.quantityReceived;
        if (totalReceiving > maxReceivable) {
          throw new ValidationError(
            `Cannot receive ${totalReceiving} of "${poItem.productName}" - only ${maxReceivable} pending`
          );
        }

        // Rejection reason required if items rejected
        if (receiptItem.quantityRejected > 0 && !receiptItem.rejectionReason) {
          throw new ValidationError(
            `Rejection reason required for "${poItem.productName}" (${receiptItem.quantityRejected} rejected)`
          );
        }

        const quantityAccepted = receiptItem.quantityReceived - receiptItem.quantityRejected;
        const isSerialized = poItem.productId
          ? productSerializationMap.get(poItem.productId)!
          : false;
        if (isSerialized && quantityAccepted > 0) {
          const normalizedSerials = (receiptItem.serialNumbers ?? []).map((sn) => normalizeSerial(sn));
          if (normalizedSerials.length !== quantityAccepted) {
            throw createSerializedMutationError(
              `Serialized product "${poItem.productName}" requires ${quantityAccepted} serial number${quantityAccepted === 1 ? '' : 's'}`,
              'invalid_serial_state'
            );
          }
          if (normalizedSerials.some((sn) => sn.length === 0)) {
            throw createSerializedMutationError(
              `Serialized product "${poItem.productName}" includes an empty serial number`,
              'invalid_serial_state'
            );
          }
          if (hasDuplicateSerials(normalizedSerials)) {
            throw createSerializedMutationError(
              `Serialized product "${poItem.productName}" has duplicate serial numbers`,
              'invalid_serial_state'
            );
          }
          for (const serial of normalizedSerials) {
            const key = `${poItem.productId}:${serial}`;
            if (serialsSeenInRequest.has(key)) {
              throw createSerializedMutationError(
                `Serial "${serial}" appears multiple times in this receipt request`,
                'invalid_serial_state'
              );
            }
            serialsSeenInRequest.add(key);
          }
        }
      }

      // -----------------------------------------------------------------------
      // 3. Calculate cost allocation for landed cost
      // -----------------------------------------------------------------------
      const poCosts = await tx
        .select()
        .from(purchaseOrderCosts)
        .where(
          and(
            eq(purchaseOrderCosts.purchaseOrderId, data.purchaseOrderId),
            eq(purchaseOrderCosts.organizationId, ctx.organizationId)
          )
        );

      // Build allocation items from PO items
      const allocationItems: AllocationItem[] = poItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
        weight: 0, // Weight not tracked on PO items
      }));

      // Allocate each cost and sum per-item
      const costAllocations = new Map<string, number>();
      for (const item of poItems) {
        costAllocations.set(item.id, 0);
      }

      for (const cost of poCosts) {
        const allocated = allocateCosts(allocationItems, {
          amount: Number(cost.amount ?? 0),
          method: (cost.allocationMethod ?? 'equal') as 'equal' | 'by_value' | 'by_weight' | 'by_quantity',
        });
        for (const [itemId, amount] of allocated) {
          costAllocations.set(itemId, (costAllocations.get(itemId) ?? 0) + amount);
        }
      }

      // -----------------------------------------------------------------------
      // 4. Create receipt header
      // -----------------------------------------------------------------------
      const totalItemsExpected = data.items.reduce(
        (sum, item) => sum + item.quantityReceived + item.quantityRejected,
        0
      );
      const totalItemsReceived = data.items.reduce((sum, item) => sum + item.quantityReceived, 0);
      const totalItemsAccepted = data.items.reduce(
        (sum, item) => sum + (item.quantityReceived - item.quantityRejected),
        0
      );
      const totalItemsRejected = data.items.reduce((sum, item) => sum + item.quantityRejected, 0);

      const [receipt] = await tx
        .insert(purchaseOrderReceipts)
        .values({
          organizationId: ctx.organizationId,
          purchaseOrderId: data.purchaseOrderId,
          receivedBy: ctx.user.id,
          receivedAt: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          deliveryReference: data.deliveryReference,
          totalItemsExpected,
          totalItemsReceived,
          totalItemsAccepted: Math.max(0, totalItemsAccepted),
          totalItemsRejected,
          status: 'accepted',
          notes: data.notes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      if (!receipt) {
        throw new ValidationError('Purchase order receipt could not be created. Refresh and try again.');
      }

      // -----------------------------------------------------------------------
      // 5. Create receipt line items + inventory updates
      // -----------------------------------------------------------------------
      const createdMovements: string[] = [];
      const productsToUpdate = new Set<string>();
      const [defaultLocation] = await tx
        .select({ id: warehouseLocations.id })
        .from(warehouseLocations)
        .where(eq(warehouseLocations.organizationId, ctx.organizationId))
        .limit(1);
      const defaultLocationId = defaultLocation?.id;
      if (!defaultLocationId) {
        throw createSerializedMutationError(
          'No warehouse location found. Create a warehouse location before receiving goods.',
          'transition_blocked'
        );
      }

      for (let i = 0; i < data.items.length; i++) {
        const receiptItem = data.items[i];
        const poItem = poItemMap.get(receiptItem.poItemId)!;
        const quantityAccepted = receiptItem.quantityReceived - receiptItem.quantityRejected;
        const isSerialized = poItem.productId
          ? productSerializationMap.get(poItem.productId)!
          : false;
        const normalizedSerials = (receiptItem.serialNumbers ?? []).map((sn) => normalizeSerial(sn));

        // Create receipt line item
        const [createdReceiptItem] = await tx.insert(purchaseOrderReceiptItems).values({
          organizationId: ctx.organizationId,
          receiptId: receipt.id,
          purchaseOrderItemId: receiptItem.poItemId,
          lineNumber: i + 1,
          quantityExpected: receiptItem.quantityReceived + receiptItem.quantityRejected,
          quantityReceived: receiptItem.quantityReceived,
          quantityAccepted,
          quantityRejected: receiptItem.quantityRejected,
          condition: receiptItem.condition,
          rejectionReason: receiptItem.rejectionReason,
          lotNumber: receiptItem.lotNumber,
          serialNumbers: normalizedSerials,
          qualityNotes: receiptItem.notes,
        }).returning({ id: purchaseOrderReceiptItems.id });

        if (!createdReceiptItem) {
          throw new ValidationError('Purchase order receipt item could not be saved. Refresh and try again.');
        }

        // Update PO item quantities
        const newReceived = poItem.quantityReceived + receiptItem.quantityReceived;
        const newRejected = poItem.quantityRejected + receiptItem.quantityRejected;
        const newPending = poItem.quantity - newReceived;

        const updatedPoItemRows = await tx
          .update(purchaseOrderItems)
          .set({
            quantityReceived: newReceived,
            quantityRejected: newRejected,
            quantityPending: newPending,
          })
          .where(
            and(
              eq(purchaseOrderItems.id, receiptItem.poItemId),
              eq(purchaseOrderItems.organizationId, ctx.organizationId),
              eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId)
            )
          )
          .returning({ id: purchaseOrderItems.id });
        if (!updatedPoItemRows[0]) {
          throw new ValidationError('Purchase order item quantities could not be updated. Refresh and try again.');
        }

        // Skip inventory updates if no product linked or nothing accepted
        if (!poItem.productId || quantityAccepted <= 0) continue;

        productsToUpdate.add(poItem.productId);

        // Calculate landed unit cost (convert PO currency to org currency if needed)
        const unitPriceInPoCurrency = Number(poItem.unitPrice ?? 0);
        const unitPriceInOrgCurrency = unitPriceToOrgCurrency(
          unitPriceInPoCurrency,
          poCurrency,
          orgCurrency,
          po.exchangeRate != null ? Number(po.exchangeRate) : null
        );
        const allocatedCostPerUnit =
          poItem.quantity > 0 ? (costAllocations.get(poItem.id) ?? 0) / poItem.quantity : 0;
        const landedUnitCost = unitPriceInOrgCurrency + allocatedCostPerUnit;

        if (isSerialized) {
          for (const serialNumber of normalizedSerials) {
            const [existingInventory] = await tx
              .select()
              .from(inventory)
              .where(
                and(
                  eq(inventory.organizationId, ctx.organizationId),
                  eq(inventory.productId, poItem.productId),
                  eq(inventory.serialNumber, serialNumber)
                )
              )
              .limit(1);

            let inventoryId: string;
            let previousQty = 0;
            if (existingInventory) {
              inventoryId = existingInventory.id;
              previousQty = Number(existingInventory.quantityOnHand ?? 0);
              if (previousQty >= 1) {
                throw createSerializedMutationError(
                  `Serialized serial ${serialNumber} already exists in stock and cannot be received twice.`,
                  'invalid_serial_state'
                );
              }
              const updatedInventory = await tx
                .update(inventory)
                .set({
                  quantityOnHand: sql`${inventory.quantityOnHand} + 1`,
                  unitCost: landedUnitCost,
                  updatedBy: ctx.user.id,
                })
                .where(
                  and(eq(inventory.id, inventoryId), eq(inventory.organizationId, ctx.organizationId))
                )
                .returning({ id: inventory.id });
              if (!updatedInventory[0]) {
                throw new ValidationError('Inventory balance could not be updated. Refresh and try again.');
              }
            } else {
              const [newInv] = await tx
                .insert(inventory)
                .values({
                  organizationId: ctx.organizationId,
                  productId: poItem.productId,
                  locationId: defaultLocationId,
                  status: 'available',
                  quantityOnHand: 1,
                  quantityAllocated: 0,
                  unitCost: landedUnitCost,
                  totalValue: landedUnitCost,
                  lotNumber: receiptItem.lotNumber,
                  serialNumber,
                  createdBy: ctx.user.id,
                  updatedBy: ctx.user.id,
                })
                .returning();
              if (!newInv) {
                throw new ValidationError('Inventory record could not be created. Refresh and try again.');
              }
              inventoryId = newInv.id;
            }

            const [movement] = await tx
              .insert(inventoryMovements)
              .values({
                organizationId: ctx.organizationId,
                inventoryId,
                productId: poItem.productId,
                locationId: defaultLocationId,
                movementType: 'receive',
                quantity: 1,
                previousQuantity: previousQty,
                newQuantity: previousQty + 1,
                unitCost: landedUnitCost,
                totalCost: landedUnitCost,
                referenceType: 'purchase_order',
                referenceId: data.purchaseOrderId,
                metadata: {
                  purchaseOrderId: data.purchaseOrderId,
                  receiptId: receipt.id,
                  poNumber: po.poNumber ?? undefined,
                  unitCost: landedUnitCost,
                  batchNumber: receiptItem.lotNumber,
                  serialNumbers: [serialNumber],
                },
                notes: `Received via ${receipt.receiptNumber}`,
                createdBy: ctx.user.id,
              })
              .returning();
            if (!movement) {
              throw new ValidationError('Inventory movement could not be recorded. Refresh and try again.');
            }
            createdMovements.push(movement.id);
            await createReceiptLayersWithCostComponents(tx, {
              organizationId: ctx.organizationId,
              inventoryId,
              quantity: 1,
              receivedAt: new Date(),
              unitCost: landedUnitCost,
              referenceType: 'purchase_order',
              referenceId: data.purchaseOrderId,
              purchaseOrderReceiptItemId: createdReceiptItem.id,
              currency: orgCurrency,
              exchangeRate: po.exchangeRate != null ? Number(po.exchangeRate) : null,
              createdBy: ctx.user.id,
              costComponents: [
                {
                  componentType: 'base_unit_cost',
                  costType: 'base',
                  amountTotal: unitPriceInOrgCurrency,
                  amountPerUnit: unitPriceInOrgCurrency,
                  quantityBasis: 1,
                  metadata: { source: 'purchase_order_item' },
                },
                {
                  componentType: 'allocated_additional_cost',
                  costType: 'additional_costs',
                  amountTotal: allocatedCostPerUnit,
                  amountPerUnit: allocatedCostPerUnit,
                  quantityBasis: 1,
                  metadata: { source: 'purchase_order_cost_allocation' },
                },
              ],
            });
            await recomputeInventoryValueFromLayers(tx, {
              organizationId: ctx.organizationId,
              inventoryId,
              userId: ctx.user.id,
            });
            await assertSerializedInventoryCostIntegrity(tx, {
              organizationId: ctx.organizationId,
              inventoryId,
              serialNumber,
              expectedQuantityOnHand: 1,
            });

            const serializedItemId = await upsertSerializedItemForInventory(tx, {
              organizationId: ctx.organizationId,
              productId: poItem.productId,
              serialNumber,
              inventoryId,
              sourceReceiptItemId: createdReceiptItem.id,
              userId: ctx.user.id,
            });
            if (serializedItemId) {
              await addSerializedItemEvent(tx, {
                organizationId: ctx.organizationId,
                serializedItemId,
                eventType: 'received',
                entityType: 'purchase_order_receipt_item',
                entityId: createdReceiptItem.id,
                notes: `Received via ${receipt.receiptNumber}`,
                userId: ctx.user.id,
              });
            }
          }
          continue;
        }

        // Non-serialized path: aggregate inventory row by product
        const [existingInventory] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.productId, poItem.productId),
              isNull(inventory.serialNumber)
            )
          )
          .limit(1);

        let inventoryId: string;

        if (existingInventory) {
          inventoryId = existingInventory.id;

          // Update inventory balance with weighted average cost
          const currentQty = Number(existingInventory.quantityOnHand ?? 0);
          const currentUnitCost = Number(existingInventory.unitCost ?? 0);
          const newQty = currentQty + quantityAccepted;
          const newWeightedAvgCost =
            newQty > 0
              ? (currentQty * currentUnitCost + quantityAccepted * landedUnitCost) / newQty
              : landedUnitCost;

          // Atomic increment: Drizzle .set() does not support column + value expressions.
          // sql template is required for race-free concurrent receives (per query-patterns.md).
          const updatedInventory = await tx
            .update(inventory)
            .set({
              quantityOnHand: sql`${inventory.quantityOnHand} + ${quantityAccepted}`,
              unitCost: newWeightedAvgCost,
              updatedBy: ctx.user.id,
            })
            .where(
              and(eq(inventory.id, inventoryId), eq(inventory.organizationId, ctx.organizationId))
            )
            .returning({ id: inventory.id });
          if (!updatedInventory[0]) {
            throw new ValidationError('Inventory balance could not be updated. Refresh and try again.');
          }
        } else {
          const [newInv] = await tx
            .insert(inventory)
            .values({
              organizationId: ctx.organizationId,
              productId: poItem.productId,
              locationId: defaultLocationId,
              status: 'available',
              quantityOnHand: quantityAccepted,
              quantityAllocated: 0,
              unitCost: landedUnitCost,
              totalValue: quantityAccepted * landedUnitCost,
              lotNumber: receiptItem.lotNumber,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            })
            .returning();

          if (!newInv) {
            throw new ValidationError('Inventory record could not be created. Refresh and try again.');
          }

          inventoryId = newInv.id;
        }

        // Get the location for this inventory record
        const invLocationId = existingInventory?.locationId ?? defaultLocationId;

        // Create inventory movement
        const previousQty = existingInventory ? Number(existingInventory.quantityOnHand ?? 0) : 0;
        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            organizationId: ctx.organizationId,
            inventoryId,
            productId: poItem.productId,
            locationId: invLocationId,
            movementType: 'receive',
            quantity: quantityAccepted,
            previousQuantity: previousQty,
            newQuantity: previousQty + quantityAccepted,
            unitCost: landedUnitCost,
            totalCost: quantityAccepted * landedUnitCost,
            referenceType: 'purchase_order',
            referenceId: data.purchaseOrderId,
            metadata: {
              purchaseOrderId: data.purchaseOrderId,
              receiptId: receipt.id,
              poNumber: po.poNumber ?? undefined,
              unitCost: landedUnitCost,
              batchNumber: receiptItem.lotNumber,
              serialNumbers: receiptItem.serialNumbers,
            },
            notes: `Received via ${receipt.receiptNumber}`,
            createdBy: ctx.user.id,
          })
          .returning();

        if (!movement) {
          throw new ValidationError('Inventory movement could not be recorded. Refresh and try again.');
        }

        createdMovements.push(movement.id);
        await createReceiptLayersWithCostComponents(tx, {
          organizationId: ctx.organizationId,
          inventoryId,
          quantity: quantityAccepted,
          receivedAt: new Date(),
          unitCost: landedUnitCost,
          referenceType: 'purchase_order',
          referenceId: data.purchaseOrderId,
          purchaseOrderReceiptItemId: createdReceiptItem.id,
          currency: orgCurrency,
          exchangeRate: po.exchangeRate != null ? Number(po.exchangeRate) : null,
          createdBy: ctx.user.id,
          costComponents: [
            {
              componentType: 'base_unit_cost',
              costType: 'base',
              amountTotal: unitPriceInOrgCurrency * quantityAccepted,
              amountPerUnit: unitPriceInOrgCurrency,
              quantityBasis: quantityAccepted,
              metadata: { source: 'purchase_order_item' },
            },
            {
              componentType: 'allocated_additional_cost',
              costType: 'additional_costs',
              amountTotal: allocatedCostPerUnit * quantityAccepted,
              amountPerUnit: allocatedCostPerUnit,
              quantityBasis: quantityAccepted,
              metadata: { source: 'purchase_order_cost_allocation' },
            },
          ],
        });
        await recomputeInventoryValueFromLayers(tx, {
          organizationId: ctx.organizationId,
          inventoryId,
          userId: ctx.user.id,
        });
      }

      // -----------------------------------------------------------------------
      // 6. Update PO status
      // -----------------------------------------------------------------------
      const updatedPoItems = await tx
        .select({
          quantity: purchaseOrderItems.quantity,
          quantityReceived: purchaseOrderItems.quantityReceived,
        })
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId),
            eq(purchaseOrderItems.organizationId, ctx.organizationId)
          )
        );

      const allReceived = updatedPoItems.every(
        (item) => item.quantityReceived >= item.quantity
      );
      const anyReceived = updatedPoItems.some((item) => item.quantityReceived > 0);

      const newStatus = allReceived ? 'received' : anyReceived ? 'partial_received' : po.status;

      if (newStatus !== po.status) {
        const updatedPurchaseOrders = await tx
          .update(purchaseOrders)
          .set({
            status: newStatus,
            ...(allReceived && { actualDeliveryDate: new Date().toISOString().split('T')[0] }),
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(purchaseOrders.id, data.purchaseOrderId),
              eq(purchaseOrders.organizationId, ctx.organizationId),
              inArray(purchaseOrders.status, ['ordered', 'partial_received']),
              isNull(purchaseOrders.deletedAt)
            )
          )
          .returning({ id: purchaseOrders.id });
        if (!updatedPurchaseOrders[0]) {
          throw new ValidationError('Purchase order status could not be updated. Refresh and try again.');
        }
      }

      // -----------------------------------------------------------------------
      // 7. Update product costPrice (weighted average from cost layers)
      // -----------------------------------------------------------------------
      for (const productId of productsToUpdate) {
        await updateProductCostPrice(tx, ctx.organizationId, productId);
      }

      return serializedMutationSuccess(
        {
          receipt,
          movementIds: createdMovements,
          newPOStatus: newStatus,
        },
        `Received goods for ${po.poNumber ?? data.purchaseOrderId}.`,
        {
          affectedIds: [data.purchaseOrderId, receipt.id],
        }
      );
    });
  });

// ============================================================================
// LIST RECEIPTS
// ============================================================================

/**
 * List all receipts for a purchase order.
 */
export const listPurchaseOrderReceipts = createServerFn({ method: 'GET' })
  .inputValidator(listReceiptsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const receipts = await db
      .select()
      .from(purchaseOrderReceipts)
      .where(
        and(
          eq(purchaseOrderReceipts.purchaseOrderId, data.purchaseOrderId),
          eq(purchaseOrderReceipts.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(purchaseOrderReceipts.receivedAt));

    // Batch fetch all receipt items in a single query with JOIN
    const receiptIds = receipts.map((r) => r.id);
    const allItems = receiptIds.length > 0
      ? await db
          .select({
            id: purchaseOrderReceiptItems.id,
            receiptId: purchaseOrderReceiptItems.receiptId,
            lineNumber: purchaseOrderReceiptItems.lineNumber,
            purchaseOrderItemId: purchaseOrderReceiptItems.purchaseOrderItemId,
            quantityExpected: purchaseOrderReceiptItems.quantityExpected,
            quantityReceived: purchaseOrderReceiptItems.quantityReceived,
            quantityAccepted: purchaseOrderReceiptItems.quantityAccepted,
            quantityRejected: purchaseOrderReceiptItems.quantityRejected,
            condition: purchaseOrderReceiptItems.condition,
            rejectionReason: purchaseOrderReceiptItems.rejectionReason,
            lotNumber: purchaseOrderReceiptItems.lotNumber,
            serialNumbers: purchaseOrderReceiptItems.serialNumbers,
            qualityNotes: purchaseOrderReceiptItems.qualityNotes,
            productId: purchaseOrderItems.productId,
            productName: purchaseOrderItems.productName,
            productSku: purchaseOrderItems.productSku,
          })
          .from(purchaseOrderReceiptItems)
          .leftJoin(
            purchaseOrderItems,
            and(
              eq(purchaseOrderReceiptItems.purchaseOrderItemId, purchaseOrderItems.id),
              eq(purchaseOrderItems.organizationId, ctx.organizationId)
            )
          )
          .where(
            and(
              inArray(purchaseOrderReceiptItems.receiptId, receiptIds),
              eq(purchaseOrderReceiptItems.organizationId, ctx.organizationId)
            )
          )
          .orderBy(asc(purchaseOrderReceiptItems.lineNumber))
      : [];

    // Group items by receiptId (reduce for ES2022 compatibility)
    type ReceiptItem = (typeof allItems)[number];
    const itemsByReceipt = allItems.reduce((acc, item) => {
      const key = item.receiptId;
      const arr = acc.get(key);
      if (arr) arr.push(item);
      else acc.set(key, [item]);
      return acc;
    }, new Map<string, ReceiptItem[]>());

    const receiptsWithItems = receipts.map((receipt) => ({
      ...receipt,
      items: (itemsByReceipt.get(receipt.id) ?? []).map(({ receiptId: _receiptId, ...item }) => item),
    }));

    return { receipts: receiptsWithItems };
  });

// ============================================================================
// HELPER: Update product costPrice from cost layers
// ============================================================================

async function updateProductCostPrice(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  productId: string
) {
  // Get all active cost layers across all inventory records for this product
  const layers = await tx
    .select({
      quantityRemaining: inventoryCostLayers.quantityRemaining,
      unitCost: inventoryCostLayers.unitCost,
    })
    .from(inventoryCostLayers)
    .innerJoin(
      inventory,
      and(
        eq(inventoryCostLayers.inventoryId, inventory.id),
        eq(inventoryCostLayers.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(inventory.productId, productId),
        eq(inventory.organizationId, organizationId),
        gt(inventoryCostLayers.quantityRemaining, 0)
      )
    );

  if (layers.length === 0) return;

  const totalRemaining = layers.reduce((sum, l) => sum + l.quantityRemaining, 0);
  const totalValue = layers.reduce(
    (sum, l) => sum + l.quantityRemaining * Number(l.unitCost),
    0
  );
  const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

  const updatedProducts = await tx
    .update(products)
    .set({ costPrice: weightedAvgCost })
    .where(
      and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    )
    .returning({ id: products.id });
  if (!updatedProducts[0]) {
    throw new ValidationError('Product cost price could not be updated. Refresh and try again.');
  }
}

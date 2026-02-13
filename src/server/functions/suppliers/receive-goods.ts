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
import { allocateCosts, type AllocationItem } from './cost-allocation';
import { unitPriceToOrgCurrency } from './receive-goods-utils';

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

const listReceiptsSchema = z.object({
  purchaseOrderId: z.string().uuid(),
});

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
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    return await db.transaction(async (tx) => {
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
        throw new ValidationError(
          `Cannot receive goods for a purchase order with status "${po.status}". Must be "ordered" or "partial_received".`
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
        .where(eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId))
        .orderBy(asc(purchaseOrderItems.lineNumber));

      const poItemMap = new Map(poItems.map((item) => [item.id, item]));

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

      // -----------------------------------------------------------------------
      // 5. Create receipt line items + inventory updates
      // -----------------------------------------------------------------------
      const createdMovements: string[] = [];
      const productsToUpdate = new Set<string>();

      for (let i = 0; i < data.items.length; i++) {
        const receiptItem = data.items[i];
        const poItem = poItemMap.get(receiptItem.poItemId)!;
        const quantityAccepted = receiptItem.quantityReceived - receiptItem.quantityRejected;

        // Create receipt line item
        await tx.insert(purchaseOrderReceiptItems).values({
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
          serialNumbers: receiptItem.serialNumbers,
          qualityNotes: receiptItem.notes,
        });

        // Update PO item quantities
        const newReceived = poItem.quantityReceived + receiptItem.quantityReceived;
        const newRejected = poItem.quantityRejected + receiptItem.quantityRejected;
        const newPending = poItem.quantity - newReceived;

        await tx
          .update(purchaseOrderItems)
          .set({
            quantityReceived: newReceived,
            quantityRejected: newRejected,
            quantityPending: newPending,
          })
          .where(eq(purchaseOrderItems.id, receiptItem.poItemId));

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

        // Find or create inventory record for this product at default location
        // Use the first warehouse location available
        const [existingInventory] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.productId, poItem.productId)
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
          await tx
            .update(inventory)
            .set({
              quantityOnHand: sql`${inventory.quantityOnHand} + ${quantityAccepted}`,
              unitCost: newWeightedAvgCost,
              totalValue: sql`(${inventory.quantityOnHand} + ${quantityAccepted}) * ${newWeightedAvgCost}`,
              updatedBy: ctx.user.id,
            })
            .where(eq(inventory.id, inventoryId));
        } else {
          // Create new inventory record - use first location for the org
          const [firstLocation] = await tx
            .select({ id: warehouseLocations.id })
            .from(warehouseLocations)
            .where(eq(warehouseLocations.organizationId, ctx.organizationId))
            .limit(1);
          const locationId = firstLocation?.id;
          if (!locationId) {
            throw new ValidationError(
              'No warehouse location found. Create a warehouse location before receiving goods.'
            );
          }

          const [newInv] = await tx
            .insert(inventory)
            .values({
              organizationId: ctx.organizationId,
              productId: poItem.productId,
              locationId,
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

          inventoryId = newInv.id;
        }

        // Get the location for this inventory record
        const invLocationId = existingInventory
          ? existingInventory.locationId
          : (await tx
              .select({ locationId: inventory.locationId })
              .from(inventory)
              .where(eq(inventory.id, inventoryId))
              .limit(1)
              .then((rows) => rows[0]?.locationId ?? ''));

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

        createdMovements.push(movement.id);

        // Create cost layer (FIFO)
        await tx.insert(inventoryCostLayers).values({
          organizationId: ctx.organizationId,
          inventoryId,
          receivedAt: new Date(),
          quantityReceived: quantityAccepted,
          quantityRemaining: quantityAccepted,
          unitCost: String(landedUnitCost),
          referenceType: 'purchase_order',
          referenceId: data.purchaseOrderId,
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
        .where(eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId));

      const allReceived = updatedPoItems.every(
        (item) => item.quantityReceived >= item.quantity
      );
      const anyReceived = updatedPoItems.some((item) => item.quantityReceived > 0);

      const newStatus = allReceived ? 'received' : anyReceived ? 'partial_received' : po.status;

      if (newStatus !== po.status) {
        await tx
          .update(purchaseOrders)
          .set({
            status: newStatus,
            ...(allReceived && { actualDeliveryDate: new Date().toISOString().split('T')[0] }),
            updatedBy: ctx.user.id,
          })
          .where(eq(purchaseOrders.id, data.purchaseOrderId));
      }

      // -----------------------------------------------------------------------
      // 7. Update product costPrice (weighted average from cost layers)
      // -----------------------------------------------------------------------
      for (const productId of productsToUpdate) {
        await updateProductCostPrice(tx, ctx.organizationId, productId);
      }

      return {
        receipt,
        movementIds: createdMovements,
        newPOStatus: newStatus,
      };
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
            qualityNotes: purchaseOrderReceiptItems.qualityNotes,
            productId: purchaseOrderItems.productId,
            productName: purchaseOrderItems.productName,
            productSku: purchaseOrderItems.productSku,
          })
          .from(purchaseOrderReceiptItems)
          .leftJoin(
            purchaseOrderItems,
            eq(purchaseOrderReceiptItems.purchaseOrderItemId, purchaseOrderItems.id)
          )
          .where(inArray(purchaseOrderReceiptItems.receiptId, receiptIds))
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
    .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
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

  await tx
    .update(products)
    .set({ costPrice: weightedAvgCost })
    .where(eq(products.id, productId));
}

/**
 * Inventory adjustment server functions.
 *
 * Owns operator stock corrections. Manual inbound stock-in belongs to
 * receiving; supplier-backed stock-in belongs to PO receiving.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { stockAdjustmentSchema } from '@/lib/schemas/inventory';
import { normalizeSerial } from '@/lib/serials';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryFinanceMutationSuccess } from '@/lib/server/inventory-finance-mutation-contract';
import {
  inventory,
  inventoryMovements,
  products,
  serializedItems,
  warehouseLocations as locations,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  isMissingSerializedInfraError,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  assertSerializedInventoryCostIntegrity,
  consumeLayersFIFO,
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  checkActivityExists,
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

/**
 * Adjust inventory quantity with full audit trail.
 */
export const adjustInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockAdjustmentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });
    const [product] = await db
      .select({
        id: products.id,
        isSerialized: products.isSerialized,
        status: products.status,
        isActive: products.isActive,
        trackInventory: products.trackInventory,
      })
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Read WITH lock inside transaction to prevent race conditions
      let [inventoryRecord] = await tx
        .select({
          id: inventory.id,
          serialNumber: inventory.serialNumber,
          quantityOnHand: inventory.quantityOnHand,
          unitCost: inventory.unitCost,
          totalValue: inventory.totalValue,
        })
        .from(inventory)
        .where(
          and(
            data.inventoryId ? eq(inventory.id, data.inventoryId) : undefined,
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId)
          )
        )
        .for('update')
        .limit(1);

      // Use fresh data from locked row
      const previousQuantity = inventoryRecord?.quantityOnHand ?? 0;
      const newQuantity = previousQuantity + data.adjustmentQty;
      const valuationBefore = Number(inventoryRecord?.totalValue ?? 0);
      const canCreateOrIncreaseStock =
        product.status === 'active' && product.isActive && product.trackInventory;
      if (!canCreateOrIncreaseStock && (data.adjustmentQty > 0 || !inventoryRecord)) {
        throw new ValidationError('Product is not available for stock increases', {
          productId: ['Only active inventory-tracked products can create or increase stock'],
          code: ['product_not_adjustable_in'],
        });
      }
      const layerDeltas: Array<{
        inventoryId?: string;
        layerId?: string;
        quantityDelta: number;
        costDelta: number;
        action: string;
      }> = [];
      const affectedLayerIds = new Set<string>();

      if (product.isSerialized) {
        if (!data.inventoryId) {
          throw new ValidationError('Serialized adjustment requires a specific inventory item', {
            inventoryId: ['Select a serialized inventory row to adjust'],
          });
        }
        if (!inventoryRecord?.serialNumber) {
          throw new ValidationError('Serialized adjustment requires an inventory row with a serial number');
        }
        if (Math.abs(data.adjustmentQty) !== 1) {
          throw new ValidationError('Serialized adjustment must be exactly one unit (+1 or -1)', {
            adjustmentQty: ['Serialized items can only be adjusted one unit at a time'],
          });
        }
        if (newQuantity !== 0 && newQuantity !== 1) {
          throw new ValidationError('Serialized inventory quantity must remain 0 or 1', {
            adjustmentQty: [`Adjustment would result in invalid serialized quantity ${newQuantity}`],
          });
        }
      }

      // Validate with fresh locked data
      if (newQuantity < 0) {
        // Check if location allows negative inventory
        const [loc] = await tx
          .select({
            attributes: locations.attributes,
          })
          .from(locations)
          .where(
            and(
              eq(locations.id, data.locationId),
              eq(locations.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!loc?.attributes?.allowNegative) {
          throw new ValidationError('Adjustment would result in negative inventory', {
            adjustmentQty: ['Would result in negative inventory'],
          });
        }
      }
      if (!inventoryRecord) {
        // Create new inventory record
        [inventoryRecord] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: 'available',
            quantityOnHand: newQuantity,
            quantityAllocated: 0,
            unitCost: 0,
            totalValue: 0,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        // Update existing record
        [inventoryRecord] = await tx
          .update(inventory)
          .set({
            quantityOnHand: newQuantity,
            totalValue: sql`${newQuantity} * COALESCE(${inventory.unitCost}, 0)`,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(inventory.id, inventoryRecord.id),
              eq(inventory.organizationId, ctx.organizationId)
            )
          )
          .returning();
      }

      const adjustmentQuantity = Math.abs(data.adjustmentQty);
      let movementUnitCost = Number(inventoryRecord.unitCost ?? 0);
      let movementTotalCost = movementUnitCost * data.adjustmentQty;
      if (data.adjustmentQty < 0) {
        const consumed = await consumeLayersFIFO(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          quantity: adjustmentQuantity,
        });
        if (consumed.quantityUnfulfilled > 0) {
          throw new ValidationError('Adjustment cannot consume more than active cost layers', {
            adjustmentQty: [
              `Missing ${consumed.quantityUnfulfilled} layer units for this adjustment`,
            ],
            code: ['insufficient_cost_layers'],
          });
        }
        movementTotalCost = -Math.abs(consumed.totalCost);
        movementUnitCost = adjustmentQuantity > 0 ? consumed.totalCost / adjustmentQuantity : 0;
        for (const delta of consumed.layerDeltas) {
          affectedLayerIds.add(delta.layerId);
          layerDeltas.push({
            inventoryId: delta.inventoryId,
            layerId: delta.layerId,
            quantityDelta: -delta.quantity,
            costDelta: -(delta.quantity * delta.unitCost),
            action: 'consume_fifo',
          });
        }
      } else if (data.adjustmentQty > 0) {
        const layerId = await createReceiptLayersWithCostComponents(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          quantity: adjustmentQuantity,
          receivedAt: new Date(),
          unitCost: movementUnitCost,
          referenceType: 'adjustment',
          currency: 'AUD',
          createdBy: ctx.user.id,
          costComponents: [
            {
              componentType: 'base_unit_cost',
              costType: 'adjustment',
              amountTotal: movementUnitCost * adjustmentQuantity,
              amountPerUnit: movementUnitCost,
              quantityBasis: adjustmentQuantity,
              metadata: { reason: data.reason },
            },
          ],
        });
        affectedLayerIds.add(layerId);
        layerDeltas.push({
          inventoryId: inventoryRecord.id,
          layerId,
          quantityDelta: adjustmentQuantity,
          costDelta: movementUnitCost * adjustmentQuantity,
          action: 'create_adjustment_layer',
        });
        movementTotalCost = movementUnitCost * adjustmentQuantity;
      }
      const recomputed = await recomputeInventoryValueFromLayers(tx, {
        organizationId: ctx.organizationId,
        inventoryId: inventoryRecord.id,
        userId: ctx.user.id,
      });
      if (product.isSerialized && inventoryRecord?.serialNumber) {
        await assertSerializedInventoryCostIntegrity(tx, {
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          serialNumber: inventoryRecord.serialNumber,
          expectedQuantityOnHand: newQuantity as 0 | 1,
        });
      }

      // Create movement record
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          productId: data.productId,
          locationId: data.locationId,
          movementType: 'adjust',
          quantity: data.adjustmentQty,
          previousQuantity,
          newQuantity,
          unitCost: movementUnitCost,
          totalCost: movementTotalCost,
          referenceType: 'adjustment',
          metadata: {
            reason: data.reason,
            serialNumbers:
              product.isSerialized && inventoryRecord?.serialNumber
                ? [normalizeSerial(inventoryRecord.serialNumber)]
                : undefined,
          },
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      if (product.isSerialized && inventoryRecord?.serialNumber) {
        const normalizedSerial = normalizeSerial(inventoryRecord.serialNumber);
        try {
          if (newQuantity > 0) {
            const serializedItemId = await upsertSerializedItemForInventory(tx, {
              organizationId: ctx.organizationId,
              productId: data.productId,
              serialNumber: normalizedSerial,
              inventoryId: inventoryRecord.id,
              status: 'available',
              userId: ctx.user.id,
            });
            if (serializedItemId) {
              await addSerializedItemEvent(tx, {
                organizationId: ctx.organizationId,
                serializedItemId,
                eventType: 'status_changed',
                entityType: 'inventory_movement',
                entityId: movement.id,
                notes: `Adjusted inventory (${data.adjustmentQty > 0 ? '+' : ''}${data.adjustmentQty})`,
                userId: ctx.user.id,
              });
            }
          } else {
            const [serializedItem] = await tx
              .select({ id: serializedItems.id })
              .from(serializedItems)
              .where(
                and(
                  eq(serializedItems.organizationId, ctx.organizationId),
                  eq(serializedItems.serialNumberNormalized, normalizedSerial)
                )
              )
              .limit(1);

            if (serializedItem) {
              await tx
                .update(serializedItems)
                .set({
                  status: 'scrapped',
                  currentInventoryId: null,
                  updatedBy: ctx.user.id,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(serializedItems.id, serializedItem.id),
                    eq(serializedItems.organizationId, ctx.organizationId)
                  )
                );
              await addSerializedItemEvent(tx, {
                organizationId: ctx.organizationId,
                serializedItemId: serializedItem.id,
                eventType: 'status_changed',
                entityType: 'inventory_movement',
                entityId: movement.id,
                notes: `Adjusted out (${data.reason})`,
                userId: ctx.user.id,
              });
            }
          }
        } catch (error) {
          if (!isMissingSerializedInfraError(error)) {
            throw error;
          }
        }
      }

      // Log activity for adjustment (significant movement) - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'product',
          entityId: data.productId,
          action: 'updated',
          description: `Inventory adjusted (movement: adjust)`,
          metadata: {
            movementId: movement.id,
            movementType: 'adjust',
            referenceType: 'adjustment',
            productId: data.productId,
            quantity: data.adjustmentQty,
            reason: data.reason,
          },
        });
      }

      return inventoryFinanceMutationSuccess(
        {
          item: inventoryRecord,
          movement,
        },
        'Inventory adjusted successfully',
        {
          affectedInventoryIds: [inventoryRecord.id],
          affectedLayerIds: Array.from(affectedLayerIds),
          financeMetadata: {
            valuationBefore,
            valuationAfter: Number(recomputed.totalValue ?? 0),
            cogsImpact: data.adjustmentQty < 0 ? Math.abs(movementTotalCost) : 0,
            layerDeltas,
          },
        }
      );
    });
  });

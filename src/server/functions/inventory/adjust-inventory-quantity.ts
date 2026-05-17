import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { StockAdjustment } from '@/lib/schemas/inventory';
import { normalizeSerial } from '@/lib/serials';
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

interface AdjustInventoryQuantityInput {
  organizationId: string;
  userId: string;
  data: StockAdjustment;
}

export async function adjustInventoryQuantity({
  organizationId,
  userId,
  data,
}: AdjustInventoryQuantityInput) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, false)`);

    const [product] = await tx
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
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      )
      .for('update')
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    const matchingInventoryRows = await tx
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
          eq(inventory.organizationId, organizationId),
          eq(inventory.productId, data.productId),
          eq(inventory.locationId, data.locationId)
        )
      )
      .for('update')
      .limit(data.inventoryId ? 1 : 2);

    if (!data.inventoryId && matchingInventoryRows.length > 1) {
      throw new ValidationError('Adjustment requires a specific inventory row', {
        inventoryId: ['Open the inventory browser and adjust the specific stock row'],
        code: ['ambiguous_adjustment_source'],
      });
    }

    let [inventoryRecord] = matchingInventoryRows;

    if (!inventoryRecord) {
      throw new ValidationError('Adjustment requires an existing inventory row', {
        inventoryId: ['Receive inventory before adjusting this stock row'],
        code: ['adjustment_requires_existing_inventory'],
      });
    }

    const previousQuantity = inventoryRecord.quantityOnHand;
    const newQuantity = previousQuantity + data.adjustmentQty;
    const valuationBefore = Number(inventoryRecord.totalValue ?? 0);
    const canCreateOrIncreaseStock =
      product.status === 'active' && product.isActive && product.trackInventory;
    if (!canCreateOrIncreaseStock && data.adjustmentQty > 0) {
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

    if (newQuantity < 0) {
      const [loc] = await tx
        .select({
          attributes: locations.attributes,
        })
        .from(locations)
        .where(and(eq(locations.id, data.locationId), eq(locations.organizationId, organizationId)))
        .limit(1);

      if (!loc?.attributes?.allowNegative) {
        throw new ValidationError('Adjustment would result in negative inventory', {
          adjustmentQty: ['Would result in negative inventory'],
        });
      }
    }

    const [updatedInventoryRecord] = await tx
      .update(inventory)
      .set({
        quantityOnHand: newQuantity,
        totalValue: sql`${newQuantity} * COALESCE(${inventory.unitCost}, 0)`,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(eq(inventory.id, inventoryRecord.id), eq(inventory.organizationId, organizationId)))
      .returning();
    if (!updatedInventoryRecord) {
      throw new NotFoundError('Inventory row not found', 'inventory');
    }
    inventoryRecord = updatedInventoryRecord;

    const adjustmentQuantity = Math.abs(data.adjustmentQty);
    let movementUnitCost = Number(inventoryRecord.unitCost ?? 0);
    let movementTotalCost = movementUnitCost * data.adjustmentQty;
    if (data.adjustmentQty < 0) {
      const consumed = await consumeLayersFIFO(tx, {
        organizationId,
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
        organizationId,
        inventoryId: inventoryRecord.id,
        quantity: adjustmentQuantity,
        receivedAt: new Date(),
        unitCost: movementUnitCost,
        referenceType: 'adjustment',
        currency: 'AUD',
        createdBy: userId,
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
      organizationId,
      inventoryId: inventoryRecord.id,
      userId,
    });
    if (product.isSerialized && inventoryRecord?.serialNumber) {
      await assertSerializedInventoryCostIntegrity(tx, {
        organizationId,
        inventoryId: inventoryRecord.id,
        serialNumber: inventoryRecord.serialNumber,
        expectedQuantityOnHand: newQuantity as 0 | 1,
      });
    }

    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        organizationId,
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
        createdBy: userId,
      })
      .returning();

    if (product.isSerialized && inventoryRecord?.serialNumber) {
      const normalizedSerial = normalizeSerial(inventoryRecord.serialNumber);
      try {
        if (newQuantity > 0) {
          const serializedItemId = await upsertSerializedItemForInventory(tx, {
            organizationId,
            productId: data.productId,
            serialNumber: normalizedSerial,
            inventoryId: inventoryRecord.id,
            status: 'available',
            userId,
          });
          if (serializedItemId) {
            await addSerializedItemEvent(tx, {
              organizationId,
              serializedItemId,
              eventType: 'status_changed',
              entityType: 'inventory_movement',
              entityId: movement.id,
              notes: `Adjusted inventory (${data.adjustmentQty > 0 ? '+' : ''}${data.adjustmentQty})`,
              userId,
            });
          }
        } else {
          const [serializedItem] = await tx
            .select({ id: serializedItems.id })
            .from(serializedItems)
            .where(
              and(
                eq(serializedItems.organizationId, organizationId),
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
                updatedBy: userId,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(serializedItems.id, serializedItem.id),
                  eq(serializedItems.organizationId, organizationId)
                )
              );
            await addSerializedItemEvent(tx, {
              organizationId,
              serializedItemId: serializedItem.id,
              eventType: 'status_changed',
              entityType: 'inventory_movement',
              entityId: movement.id,
              notes: `Adjusted out (${data.reason})`,
              userId,
            });
          }
        }
      } catch (error) {
        if (!isMissingSerializedInfraError(error)) {
          throw error;
        }
      }
    }

    const activityExists = await checkActivityExists(tx, organizationId, movement.id);
    if (!activityExists) {
      await logActivityInTransaction(tx, { organizationId, user: { id: userId } }, {
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
}

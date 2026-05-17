import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { normalizeSerial } from '@/lib/serials';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryFinanceMutationSuccess } from '@/lib/server/inventory-finance-mutation-contract';
import {
  inventory,
  inventoryMovements,
  serializedItems,
  stockCountItems,
  stockCounts,
} from 'drizzle/schema';
import {
  assertSerializedInventoryCostIntegrity,
  consumeLayersFIFO,
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  addSerializedItemEvent,
  isMissingSerializedInfraError,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';

interface CompleteStockCountReconciliationInput {
  organizationId: string;
  userId: string;
  data: {
    id: string;
    notes?: string;
    applyAdjustments: boolean;
  };
}

function assertStockCountInventorySnapshotFresh({
  currentQuantity,
  expectedQuantity,
}: {
  currentQuantity: number;
  expectedQuantity: number;
}) {
  if (currentQuantity !== expectedQuantity) {
    throw new ConflictError(
      'Inventory changed since count sheet was generated. Refresh and recount before completing.'
    );
  }
}

export async function completeStockCountReconciliation({
  organizationId,
  userId,
  data,
}: CompleteStockCountReconciliationInput) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, false)`);

    const [count] = await tx
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, organizationId)))
      .for('update')
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status !== 'in_progress') {
      throw new ValidationError(`Cannot complete count in ${count.status} status`, {
        status: ['Count must be in progress'],
      });
    }

    const items = await tx
      .select()
      .from(stockCountItems)
      .where(eq(stockCountItems.stockCountId, data.id));

    const uncountedItems = items.filter((i) => i.countedQuantity === null);
    if (uncountedItems.length > 0) {
      throw new ValidationError(`${uncountedItems.length} items have not been counted`, {
        items: ['All items must be counted before completing'],
      });
    }

    const varianceItems = items.filter((i) => i.countedQuantity !== i.expectedQuantity);

    const adjustments: (typeof inventoryMovements.$inferSelect)[] = [];
    const affectedInventoryIds = new Set<string>();
    const affectedProductIds = new Set<string>();
    const affectedLayerIds = new Set<string>();
    let valuationBefore = 0;
    let valuationAfter = 0;
    let cogsImpact = 0;
    const layerDeltas: Array<{
      inventoryId?: string;
      layerId?: string;
      quantityDelta: number;
      costDelta: number;
      action: string;
    }> = [];

    if (items.length > 0) {
      const inventoryIds = Array.from(new Set(items.map((item) => item.inventoryId)));
      const inventoryRecords = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.organizationId, organizationId), inArray(inventory.id, inventoryIds)))
        .for('update');

      const inventoryMap = new Map(inventoryRecords.map((inv) => [inv.id, inv]));

      for (const item of items) {
        const inv = inventoryMap.get(item.inventoryId);
        if (!inv) {
          throw new ConflictError(
            'Inventory changed since count sheet was generated. Refresh and recount before completing.'
          );
        }

        assertStockCountInventorySnapshotFresh({
          currentQuantity: Number(inv.quantityOnHand ?? 0),
          expectedQuantity: item.expectedQuantity,
        });
      }

      if (data.applyAdjustments && varianceItems.length > 0) {
        for (const item of varianceItems) {
          const inv = inventoryMap.get(item.inventoryId);
          if (!inv) continue;

          const previousQuantity = Number(inv.quantityOnHand ?? 0);
          const variance = (item.countedQuantity ?? 0) - item.expectedQuantity;
          if (variance === 0) continue;

          const newQuantity = previousQuantity + variance;
          const previousValue = Number(inv.totalValue ?? 0);
          valuationBefore += previousValue;
          affectedInventoryIds.add(inv.id);
          affectedProductIds.add(inv.productId);

          if (newQuantity < 0) {
            throw new ValidationError('Count adjustment would result in negative inventory', {
              quantity: [`Inventory ${item.inventoryId} would become ${newQuantity}`],
            });
          }

          const isSerializedRow = !!inv.serialNumber;
          if (isSerializedRow && newQuantity !== 0 && newQuantity !== 1) {
            throw new ValidationError('Serialized inventory quantity must remain 0 or 1', {
              quantity: [`Serialized row ${item.inventoryId} would become ${newQuantity}`],
              code: ['serialized_unit_violation'],
            });
          }

          await tx
            .update(inventory)
            .set({
              quantityOnHand: newQuantity,
              updatedAt: new Date(),
              updatedBy: userId,
            })
            .where(and(eq(inventory.id, inv.id), eq(inventory.organizationId, organizationId)));

          let movementUnitCost = Number(inv.unitCost ?? 0);
          let movementTotalCost = movementUnitCost * variance;

          if (variance < 0) {
            const consumed = await consumeLayersFIFO(tx, {
              organizationId,
              inventoryId: inv.id,
              quantity: Math.abs(variance),
            });
            if (consumed.quantityUnfulfilled > 0) {
              throw new ValidationError(
                'Count adjustment cannot consume more than active cost layers',
                {
                  quantity: [
                    `Missing ${consumed.quantityUnfulfilled} layer units for inventory ${inv.id}`,
                  ],
                  code: ['insufficient_cost_layers'],
                }
              );
            }
            movementTotalCost = -Math.abs(consumed.totalCost);
            movementUnitCost = Math.abs(variance) > 0 ? consumed.totalCost / Math.abs(variance) : 0;
            cogsImpact += Math.abs(consumed.totalCost);
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
          } else {
            const createdLayerId = await createReceiptLayersWithCostComponents(tx, {
              organizationId,
              inventoryId: inv.id,
              quantity: variance,
              receivedAt: new Date(),
              unitCost: movementUnitCost,
              referenceType: 'adjustment',
              referenceId: data.id,
              currency: 'AUD',
              createdBy: userId,
              costComponents: [
                {
                  componentType: 'base_unit_cost',
                  costType: 'stock_count_adjustment',
                  amountTotal: movementUnitCost * variance,
                  amountPerUnit: movementUnitCost,
                  quantityBasis: variance,
                  metadata: { source: 'stock_count', countCode: count.countCode },
                },
              ],
            });
            affectedLayerIds.add(createdLayerId);
            layerDeltas.push({
              inventoryId: inv.id,
              layerId: createdLayerId,
              quantityDelta: variance,
              costDelta: movementUnitCost * variance,
              action: 'create_adjustment_layer',
            });
          }

          const recomputed = await recomputeInventoryValueFromLayers(tx, {
            organizationId,
            inventoryId: inv.id,
            userId,
          });
          valuationAfter += Number(recomputed.totalValue ?? 0);

          if (isSerializedRow && inv.serialNumber) {
            await assertSerializedInventoryCostIntegrity(tx, {
              organizationId,
              inventoryId: inv.id,
              serialNumber: inv.serialNumber,
              expectedQuantityOnHand: newQuantity as 0 | 1,
            });
          }

          const [movement] = await tx
            .insert(inventoryMovements)
            .values({
              organizationId,
              inventoryId: inv.id,
              productId: inv.productId,
              locationId: inv.locationId,
              movementType: 'adjust',
              quantity: variance,
              previousQuantity,
              newQuantity,
              unitCost: movementUnitCost,
              totalCost: movementTotalCost,
              referenceType: 'count',
              referenceId: data.id,
              metadata: {
                countCode: count.countCode,
                varianceReason: item.varianceReason ?? undefined,
                cogsUnitCost: movementUnitCost,
                cogsTotal: movementTotalCost,
              },
              notes: item.varianceReason ?? `Count adjustment from ${count.countCode}`,
              createdBy: userId,
            })
            .returning();

          if (isSerializedRow && inv.serialNumber) {
            const normalizedSerial = normalizeSerial(inv.serialNumber);
            try {
              if (newQuantity > 0) {
                const serializedItemId = await upsertSerializedItemForInventory(tx, {
                  organizationId,
                  productId: inv.productId,
                  serialNumber: normalizedSerial,
                  inventoryId: inv.id,
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
                    notes: `Count adjustment from ${count.countCode} (+${variance})`,
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
                    notes: `Count adjustment from ${count.countCode}`,
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

          adjustments.push(movement);
        }

        await tx
          .update(stockCountItems)
          .set({
            reviewedBy: userId,
            reviewedAt: new Date(),
          })
          .where(
            and(
              eq(stockCountItems.stockCountId, data.id),
              inArray(
                stockCountItems.id,
                varianceItems.map((item) => item.id)
              )
            )
          );
      }
    }

    const [completedCount] = await tx
      .update(stockCounts)
      .set({
        status: 'completed',
        completedAt: new Date(),
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes || count.notes,
        updatedAt: new Date(),
        updatedBy: userId,
        version: sql`${stockCounts.version} + 1`,
      })
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, organizationId)))
      .returning();

    return inventoryFinanceMutationSuccess(
      {
        count: completedCount,
        adjustments,
        summary: {
          totalItems: items.length,
          varianceItems: varianceItems.length,
          adjustmentsMade: adjustments.length,
        },
      },
      'Stock count completed successfully',
      {
        affectedInventoryIds: Array.from(affectedInventoryIds),
        affectedProductIds: Array.from(affectedProductIds),
        affectedLayerIds: Array.from(affectedLayerIds),
        financeMetadata: {
          valuationBefore,
          valuationAfter,
          cogsImpact,
          layerDeltas,
        },
      }
    );
  });
}

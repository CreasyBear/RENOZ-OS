/**
 * Inventory transfer server functions.
 *
 * Owns warehouse-to-warehouse stock movement, including serialized lineage and
 * cost-layer continuity.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { stockTransferSchema } from '@/lib/schemas/inventory';
import { normalizeSerial } from '@/lib/serials';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryFinanceMutationSuccess } from '@/lib/server/inventory-finance-mutation-contract';
import {
  inventory,
  inventoryMovements,
  products,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  assertSerializedInventoryCostIntegrity,
  moveLayersBetweenInventory,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  checkActivityExists,
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

/**
 * Transfer inventory between locations.
 */
export const transferInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockTransferSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });
    const [product] = await db
      .select({ id: products.id, isSerialized: products.isSerialized })
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

    if (data.fromLocationId === data.toLocationId) {
      throw new ValidationError('Cannot transfer to the same location', {
        toLocationId: ['Cannot be the same as source location'],
      });
    }

    const normalizedSerials = (data.serialNumbers ?? []).map((serial) => normalizeSerial(serial));
    if (product.isSerialized) {
      if (normalizedSerials.length === 0) {
        throw new ValidationError('Serialized transfer requires serial numbers', {
          serialNumbers: ['Select at least one serial number to transfer'],
        });
      }
      if (normalizedSerials.length !== data.quantity) {
        throw new ValidationError('Quantity must match serial count for serialized products', {
          quantity: [
            `Expected quantity ${normalizedSerials.length} to match selected serial numbers`,
          ],
        });
      }
    } else if (normalizedSerials.length > 0) {
      throw new ValidationError('Serial numbers are only valid for serialized products', {
        serialNumbers: ['Remove serial numbers for non-serialized transfer'],
      });
    }

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const affectedInventoryIds = new Set<string>();
      const affectedLayerIds = new Set<string>();
      let valuationBefore = 0;
      let valuationAfter = 0;
      const layerDeltas: Array<{
        inventoryId?: string;
        layerId?: string;
        quantityDelta: number;
        costDelta: number;
        action: string;
      }> = [];

      // Read source WITH lock inside transaction to prevent race conditions
      const [sourceInventory] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            data.inventoryId ? eq(inventory.id, data.inventoryId) : undefined,
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.fromLocationId)
          )
        )
        .for('update')
        .limit(1);

      if (!sourceInventory) {
        throw new NotFoundError('Source inventory not found', 'inventory');
      }

      if (product.isSerialized) {
        const serialSet = new Set(normalizedSerials);
        const serializedSourceRows = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              eq(inventory.productId, data.productId),
              eq(inventory.locationId, data.fromLocationId),
              inArray(inventory.serialNumber, normalizedSerials)
            )
          )
          .for('update');

        const bySerial = new Map(
          serializedSourceRows
            .filter((row) => !!row.serialNumber)
            .map((row) => [normalizeSerial(row.serialNumber as string), row] as const)
        );

        if (bySerial.size !== serialSet.size) {
          const missing = normalizedSerials.find((serial) => !bySerial.has(serial));
          throw new ValidationError('Serial not found in source location', {
            serialNumbers: [`Serial ${missing ?? 'unknown'} is not in source inventory`],
          });
        }

        for (const serialNumber of normalizedSerials) {
          const row = bySerial.get(serialNumber);
          if (!row) continue;
          if ((row.quantityAvailable ?? 0) < 1) {
            throw new ValidationError('Serial is not available for transfer', {
              serialNumbers: [`Serial ${serialNumber} has no available quantity`],
            });
          }

          const sourcePrevQty = Number(row.quantityOnHand ?? 0);
          const sourceNextQty = sourcePrevQty - 1;
          const sourcePrevValue = Number(row.totalValue ?? 0);
          valuationBefore += sourcePrevValue;
          affectedInventoryIds.add(row.id);
          await tx
            .update(inventory)
            .set({
              quantityOnHand: sourceNextQty,
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(eq(inventory.id, row.id));

          await tx.insert(inventoryMovements).values({
            organizationId: ctx.organizationId,
            inventoryId: row.id,
            productId: data.productId,
            locationId: data.fromLocationId,
            movementType: 'transfer',
            quantity: -1,
            previousQuantity: sourcePrevQty,
            newQuantity: sourceNextQty,
            unitCost: row.unitCost,
            totalCost: sql`${-1} * COALESCE(${row.unitCost}, 0)`,
            referenceType: 'transfer',
            metadata: {
              serialNumbers: [serialNumber],
              fromLocationId: data.fromLocationId,
              toLocationId: data.toLocationId,
            },
            notes: data.notes,
            createdBy: ctx.user.id,
          });

          let [destRow] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.organizationId, ctx.organizationId),
                eq(inventory.productId, data.productId),
                eq(inventory.locationId, data.toLocationId),
                eq(inventory.serialNumber, serialNumber)
              )
            )
            .for('update')
            .limit(1);

          const destPrevQty = Number(destRow?.quantityOnHand ?? 0);
          const destNextQty = destPrevQty + 1;
          const destPrevValue = Number(destRow?.totalValue ?? 0);
          valuationBefore += destPrevValue;
          if (!destRow) {
            [destRow] = await tx
              .insert(inventory)
              .values({
                organizationId: ctx.organizationId,
                productId: data.productId,
                locationId: data.toLocationId,
                status: 'available',
                quantityOnHand: 1,
                quantityAllocated: 0,
                unitCost: row.unitCost,
                totalValue: 0,
                lotNumber: row.lotNumber,
                serialNumber,
                expiryDate: row.expiryDate,
                createdBy: ctx.user.id,
                updatedBy: ctx.user.id,
              })
              .returning();
          } else {
            if (destPrevQty >= 1) {
              throw new ValidationError('Serialized destination already has an active unit', {
                serialNumbers: [`Serial ${serialNumber} already exists at destination location`],
                code: ['serialized_unit_violation'],
              });
            }
            [destRow] = await tx
              .update(inventory)
              .set({
                quantityOnHand: destNextQty,
                updatedAt: new Date(),
                updatedBy: ctx.user.id,
              })
              .where(eq(inventory.id, destRow.id))
              .returning();
          }

          const transferred = await moveLayersBetweenInventory(tx, {
            organizationId: ctx.organizationId,
            sourceInventoryId: row.id,
            destinationInventoryId: destRow.id,
            quantity: 1,
            referenceType: 'transfer',
            receivedAt: new Date(),
          });
          if (transferred.quantityUnfulfilled > 0) {
            throw new ValidationError('Serialized transfer has missing layer quantities', {
              serialNumbers: [`Serial ${serialNumber} missing cost layers`],
              code: ['layer_transfer_mismatch'],
            });
          }
          const sourceRecomputed = await recomputeInventoryValueFromLayers(tx, {
            organizationId: ctx.organizationId,
            inventoryId: row.id,
            userId: ctx.user.id,
          });
          const destRecomputed = await recomputeInventoryValueFromLayers(tx, {
            organizationId: ctx.organizationId,
            inventoryId: destRow.id,
            userId: ctx.user.id,
          });
          valuationAfter += Number(sourceRecomputed.totalValue ?? 0);
          valuationAfter += Number(destRecomputed.totalValue ?? 0);
          affectedInventoryIds.add(destRow.id);
          for (const delta of transferred.layerDeltas) {
            affectedLayerIds.add(delta.layerId);
            layerDeltas.push({
              inventoryId: delta.inventoryId,
              layerId: delta.layerId,
              quantityDelta: -delta.quantity,
              costDelta: -(delta.quantity * delta.unitCost),
              action: 'transfer_out',
            });
          }
          transferred.createdLayerIds.forEach((layerId, index) => {
            const correspondingDelta = transferred.layerDeltas[index];
            affectedLayerIds.add(layerId);
            layerDeltas.push({
              inventoryId: destRow.id,
              layerId,
              quantityDelta: correspondingDelta?.quantity ?? 1,
              costDelta: correspondingDelta
                ? correspondingDelta.quantity * correspondingDelta.unitCost
                : Number(row.unitCost ?? 0),
              action: 'transfer_in',
            });
          });
          await assertSerializedInventoryCostIntegrity(tx, {
            organizationId: ctx.organizationId,
            inventoryId: row.id,
            serialNumber,
            expectedQuantityOnHand: 0,
          });
          await assertSerializedInventoryCostIntegrity(tx, {
            organizationId: ctx.organizationId,
            inventoryId: destRow.id,
            serialNumber,
            expectedQuantityOnHand: 1,
          });

          await tx.insert(inventoryMovements).values({
            organizationId: ctx.organizationId,
            inventoryId: destRow.id,
            productId: data.productId,
            locationId: data.toLocationId,
            movementType: 'transfer',
            quantity: 1,
            previousQuantity: destPrevQty,
            newQuantity: destNextQty,
            unitCost: row.unitCost,
            totalCost: row.unitCost,
            referenceType: 'transfer',
            metadata: {
              serialNumbers: [serialNumber],
              fromLocationId: data.fromLocationId,
              toLocationId: data.toLocationId,
            },
            notes: data.notes,
            createdBy: ctx.user.id,
          });

          const serializedItemId = await upsertSerializedItemForInventory(tx, {
            organizationId: ctx.organizationId,
            productId: data.productId,
            serialNumber,
            inventoryId: destRow.id,
            status: 'available',
            userId: ctx.user.id,
          });
          if (serializedItemId) {
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              eventType: 'status_changed',
              entityType: 'inventory',
              entityId: destRow.id,
              notes: `Transferred from ${data.fromLocationId} to ${data.toLocationId}`,
              userId: ctx.user.id,
            });
          }
        }

        return inventoryFinanceMutationSuccess(
          {
            sourceItem: { ...sourceInventory, quantityOnHand: Number(sourceInventory.quantityOnHand ?? 0) - data.quantity },
            destinationItem: null,
            movement: null,
          },
          'Inventory transferred successfully',
          {
            affectedInventoryIds: Array.from(affectedInventoryIds),
            affectedLayerIds: Array.from(affectedLayerIds),
            financeMetadata: {
              valuationBefore,
              valuationAfter,
              cogsImpact: 0,
              layerDeltas,
            },
          }
        );
      }

      // Validate with fresh locked data
      if ((sourceInventory.quantityAvailable ?? 0) < data.quantity) {
        throw new ValidationError('Insufficient available quantity for transfer', {
          quantity: [`Only ${sourceInventory.quantityAvailable} available`],
        });
      }

      // Use fresh data from locked row
      const newSourceQty = (sourceInventory.quantityOnHand ?? 0) - data.quantity;
      valuationBefore += Number(sourceInventory.totalValue ?? 0);
      affectedInventoryIds.add(sourceInventory.id);
      await tx
        .update(inventory)
        .set({
          quantityOnHand: newSourceQty,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(inventory.id, sourceInventory.id));

      // Create outbound movement
      await tx.insert(inventoryMovements).values({
        organizationId: ctx.organizationId,
        inventoryId: sourceInventory.id,
        productId: data.productId,
        locationId: data.fromLocationId,
        movementType: 'transfer',
        quantity: -data.quantity,
        previousQuantity: sourceInventory.quantityOnHand ?? 0,
        newQuantity: newSourceQty,
        unitCost: sourceInventory.unitCost,
        totalCost: sql`${-data.quantity} * COALESCE(${sourceInventory.unitCost}, 0)`,
        referenceType: 'transfer',
        notes: data.notes,
        createdBy: ctx.user.id,
      });

      // Find or create destination inventory WITH lock
      let [destInventory] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.toLocationId)
          )
        )
        .for('update')
        .limit(1);

      const destPrevQty = destInventory?.quantityOnHand ?? 0;
      const destNewQty = destPrevQty + data.quantity;
      valuationBefore += Number(destInventory?.totalValue ?? 0);

      if (!destInventory) {
        [destInventory] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.toLocationId,
            status: 'available',
            quantityOnHand: destNewQty,
            quantityAllocated: 0,
            unitCost: sourceInventory.unitCost,
            totalValue: 0,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        [destInventory] = await tx
          .update(inventory)
          .set({
            quantityOnHand: destNewQty,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, destInventory.id))
          .returning();
      }

      const movedLayers = await moveLayersBetweenInventory(tx, {
        organizationId: ctx.organizationId,
        sourceInventoryId: sourceInventory.id,
        destinationInventoryId: destInventory.id,
        quantity: data.quantity,
        referenceType: 'transfer',
        receivedAt: new Date(),
      });
      if (movedLayers.quantityUnfulfilled > 0) {
        throw new ValidationError('Transfer has missing layer quantities', {
          quantity: [`${movedLayers.quantityUnfulfilled} units have no cost layer to transfer`],
          code: ['layer_transfer_mismatch'],
        });
      }
      const sourceRecomputed = await recomputeInventoryValueFromLayers(tx, {
        organizationId: ctx.organizationId,
        inventoryId: sourceInventory.id,
        userId: ctx.user.id,
      });
      const destRecomputed = await recomputeInventoryValueFromLayers(tx, {
        organizationId: ctx.organizationId,
        inventoryId: destInventory.id,
        userId: ctx.user.id,
      });
      valuationAfter += Number(sourceRecomputed.totalValue ?? 0);
      valuationAfter += Number(destRecomputed.totalValue ?? 0);
      affectedInventoryIds.add(destInventory.id);
      for (const delta of movedLayers.layerDeltas) {
        affectedLayerIds.add(delta.layerId);
        layerDeltas.push({
          inventoryId: delta.inventoryId,
          layerId: delta.layerId,
          quantityDelta: -delta.quantity,
          costDelta: -(delta.quantity * delta.unitCost),
          action: 'transfer_out',
        });
      }
      movedLayers.createdLayerIds.forEach((layerId, index) => {
        const correspondingDelta = movedLayers.layerDeltas[index];
        affectedLayerIds.add(layerId);
        layerDeltas.push({
          inventoryId: destInventory.id,
          layerId,
          quantityDelta: correspondingDelta?.quantity ?? 0,
          costDelta: correspondingDelta
            ? correspondingDelta.quantity * correspondingDelta.unitCost
            : 0,
          action: 'transfer_in',
        });
      });

      // Create inbound movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: destInventory.id,
          productId: data.productId,
          locationId: data.toLocationId,
          movementType: 'transfer',
          quantity: data.quantity,
          previousQuantity: destPrevQty,
          newQuantity: destNewQty,
          unitCost: sourceInventory.unitCost,
          totalCost: sql`${data.quantity} * COALESCE(${sourceInventory.unitCost}, 0)`,
          referenceType: 'transfer',
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity for transfer - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'inventory',
          entityId: destInventory.id,
          action: 'updated',
          description: `Inventory transferred from ${data.fromLocationId} to ${data.toLocationId}`,
          metadata: {
            movementId: movement.id,
            movementType: 'transfer',
            productId: data.productId,
            quantity: data.quantity,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
          },
        });
      }

      return inventoryFinanceMutationSuccess(
        {
          sourceItem: { ...sourceInventory, quantityOnHand: newSourceQty },
          destinationItem: destInventory,
          movement,
        },
        'Inventory transferred successfully',
        {
          affectedInventoryIds: Array.from(affectedInventoryIds),
          affectedLayerIds: Array.from(affectedLayerIds),
          financeMetadata: {
            valuationBefore,
            valuationAfter,
            cogsImpact: 0,
            layerDeltas,
          },
        }
      );
    });
  });

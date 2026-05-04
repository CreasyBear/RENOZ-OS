/**
 * Inventory receiving server functions.
 *
 * Owns manual non-PO stock-in. Supplier-backed PO receiving lives under
 * supplier/purchase-order workflows.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  getManualReceiveSerializationIssues,
  receiveInventorySchema,
} from '@/lib/schemas/inventory';
import { normalizeSerial } from '@/lib/serials';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryFinanceMutationSuccess } from '@/lib/server/inventory-finance-mutation-contract';
import {
  inventory,
  inventoryCostLayers,
  inventoryMovements,
  products,
  warehouseLocations as locations,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  createReceiptLayersWithCostComponents,
  recomputeInventoryValueFromLayers,
} from '@/server/functions/_shared/inventory-finance';
import {
  checkActivityExists,
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

/**
 * Receive inventory with cost layer creation.
 */
export const receiveInventory = createServerFn({ method: 'POST' })
  .inputValidator(receiveInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    // Validate product exists (only need id for existence check)
    const [product] = await db
      .select({ id: products.id, isSerialized: products.isSerialized })
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }
    const normalizedSerialNumber = data.serialNumber ? normalizeSerial(data.serialNumber) : undefined;
    const serializationIssues = getManualReceiveSerializationIssues({
      isSerialized: product.isSerialized,
      quantity: data.quantity,
      serialNumber: normalizedSerialNumber,
    });
    if (serializationIssues.length > 0) {
      const issue = serializationIssues[0];
      throw new ValidationError(issue.message, {
        [issue.path]: [issue.message],
        code: [issue.code],
      });
    }

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Validate location exists (inside transaction)
      const [location] = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(eq(locations.id, data.locationId), eq(locations.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (!location) {
        throw new NotFoundError('Location not found', 'location');
      }

      // Find existing inventory record WITH lock to prevent race conditions
      let [inventoryRecord] = await tx
        .select({
          id: inventory.id,
          productId: inventory.productId,
          locationId: inventory.locationId,
          quantityOnHand: inventory.quantityOnHand,
          totalValue: inventory.totalValue,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId),
            ...(product.isSerialized && normalizedSerialNumber
              ? [eq(inventory.serialNumber, normalizedSerialNumber)]
              : []),
            data.lotNumber ? eq(inventory.lotNumber, data.lotNumber) : isNull(inventory.lotNumber)
          )
        )
        .for('update')
        .limit(1);

      const prevQuantity = inventoryRecord?.quantityOnHand ?? 0;
      const newQuantity = prevQuantity + data.quantity;
      const valuationBefore = Number(inventoryRecord?.totalValue ?? 0);
      if (product.isSerialized && newQuantity > 1) {
        throw new ValidationError('Serialized inventory cannot exceed one unit', {
          quantity: [`Serial ${normalizedSerialNumber ?? ''} is already in stock`],
          code: ['serialized_unit_violation'],
        });
      }

      // Calculate weighted average cost
      const prevTotalCost = inventoryRecord?.totalValue ?? 0;
      const newTotalCost = prevTotalCost + data.quantity * data.unitCost;
      const newUnitCost = newQuantity > 0 ? newTotalCost / newQuantity : data.unitCost;

      if (!inventoryRecord) {
        [inventoryRecord] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: 'available',
            quantityOnHand: newQuantity,
            quantityAllocated: 0,
            unitCost: newUnitCost,
            totalValue: 0,
            lotNumber: data.lotNumber,
            serialNumber: normalizedSerialNumber,
            expiryDate: data.expiryDate,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        [inventoryRecord] = await tx
          .update(inventory)
          .set({
            quantityOnHand: newQuantity,
            unitCost: newUnitCost,
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

      // Create movement record
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          productId: data.productId,
          locationId: data.locationId,
          movementType: 'receive',
          quantity: data.quantity,
          previousQuantity: prevQuantity,
          newQuantity,
          unitCost: data.unitCost,
          totalCost: data.quantity * data.unitCost,
          referenceType: data.referenceType ?? 'manual_receive',
          referenceId: data.referenceId,
          metadata: {
            receiptReason: data.receiptReason,
          },
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      const costLayerId = await createReceiptLayersWithCostComponents(tx, {
        organizationId: ctx.organizationId,
        inventoryId: inventoryRecord.id,
        quantity: data.quantity,
        receivedAt: new Date(),
        unitCost: data.unitCost,
        referenceType: 'manual_receive',
        currency: 'AUD',
        createdBy: ctx.user.id,
        costComponents: [
          {
            componentType: 'base_unit_cost',
            costType: 'manual_receive',
            amountTotal: data.quantity * data.unitCost,
            amountPerUnit: data.unitCost,
            quantityBasis: data.quantity,
            metadata: {
              source: 'inventory_receive',
              receiptReason: data.receiptReason,
            },
          },
        ],
      });
      const recomputed = await recomputeInventoryValueFromLayers(tx, {
        organizationId: ctx.organizationId,
        inventoryId: inventoryRecord.id,
        userId: ctx.user.id,
      });
      const [costLayer] = await tx
        .select()
        .from(inventoryCostLayers)
        .where(
          and(
            eq(inventoryCostLayers.id, costLayerId),
            eq(inventoryCostLayers.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (product.isSerialized && normalizedSerialNumber) {
        const serializedItemId = await upsertSerializedItemForInventory(tx, {
          organizationId: ctx.organizationId,
          productId: data.productId,
          serialNumber: normalizedSerialNumber,
          inventoryId: inventoryRecord.id,
          userId: ctx.user.id,
        });
        if (serializedItemId) {
          await addSerializedItemEvent(tx, {
            organizationId: ctx.organizationId,
            serializedItemId,
            eventType: 'received',
            entityType: 'inventory_movement',
            entityId: movement.id,
            notes: data.notes ?? 'Received into inventory',
            userId: ctx.user.id,
          });
        }
      }

      // Log activity for receive - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'inventory',
          entityId: inventoryRecord.id,
          action: prevQuantity === 0 ? 'created' : 'updated',
          description: `Inventory received (${data.quantity} units)`,
          metadata: {
            movementId: movement.id,
            movementType: 'receive',
            productId: data.productId,
            locationId: data.locationId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            receiptReason: data.receiptReason,
          },
        });
      }

      return inventoryFinanceMutationSuccess(
        {
          item: inventoryRecord,
          movement,
          costLayer,
        },
        'Inventory received successfully',
        {
          affectedInventoryIds: [inventoryRecord.id],
          affectedLayerIds: [costLayerId],
          financeMetadata: {
            valuationBefore,
            valuationAfter: Number(recomputed.totalValue ?? 0),
            cogsImpact: 0,
            layerDeltas: [
              {
                inventoryId: inventoryRecord.id,
                layerId: costLayerId,
                quantityDelta: data.quantity,
                costDelta: data.quantity * data.unitCost,
                action: 'receive',
              },
            ],
          },
        }
      );
    });
  });

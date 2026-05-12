/**
 * Inventory status update server functions.
 *
 * Owns bulk operator status changes with movement audit rows and activity logs.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { inventoryStatusSchema } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { ValidationError } from '@/lib/server/errors';
import {
  inventory,
  inventoryMovements,
} from 'drizzle/schema';
import {
  addSerializedItemEvent,
  upsertSerializedItemForInventory,
} from '@/server/functions/_shared/serialized-lineage';
import {
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

const bulkUpdateStatusSchema = z.object({
  inventoryIds: z.array(z.string().uuid()).min(1).max(100),
  status: inventoryStatusSchema,
  reason: z.string().min(1),
});

type InventoryStatus = typeof inventory.$inferSelect.status;
type OperatorDispositionStatus = Extract<
  InventoryStatus,
  'available' | 'damaged' | 'returned' | 'quarantined'
>;
type SerializedStatus = 'available' | 'returned' | 'quarantined' | 'scrapped';

const operatorDispositionStatuses = [
  'available',
  'damaged',
  'returned',
  'quarantined',
] as const satisfies readonly OperatorDispositionStatus[];

function isOperatorDispositionStatus(status: InventoryStatus): status is OperatorDispositionStatus {
  return (operatorDispositionStatuses as readonly InventoryStatus[]).includes(status);
}

function mapInventoryStatusToSerializedStatus(status: OperatorDispositionStatus): SerializedStatus {
  if (status === 'damaged') return 'scrapped';
  if (status === 'returned' || status === 'quarantined') return status;
  return status;
}

/**
 * Bulk update inventory status.
 */
export const bulkUpdateStatus = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });

    if (!isOperatorDispositionStatus(data.status)) {
      throw new ValidationError('Bulk status changes cannot set workflow-owned statuses', {
        status: ['Use allocation or fulfillment workflows for allocated or sold inventory'],
        code: ['workflow_owned_inventory_status'],
      });
    }
    const targetStatus = data.status;

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const targetItems = await tx
        .select({
          id: inventory.id,
          quantityAllocated: inventory.quantityAllocated,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            inArray(inventory.id, data.inventoryIds)
          )
        )
        .for('update');

      const allocatedItems = targetItems.filter((item) => Number(item.quantityAllocated ?? 0) > 0);
      if (allocatedItems.length > 0) {
        throw new ValidationError('Cannot change status for allocated inventory', {
          inventoryIds: ['Release allocations before changing inventory status'],
          code: ['allocated_inventory_status_change'],
        });
      }

      const targetItemIds = targetItems.map((item) => item.id);
      if (targetItemIds.length === 0) {
        return {
          updatedCount: 0,
          items: [],
        };
      }

      // Update all items
      const updated = await tx
        .update(inventory)
        .set({
          status: targetStatus,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            inArray(inventory.id, targetItemIds)
          )
        )
        .returning();

      // OPTIMIZED: Bulk insert movement records instead of sequential inserts
      if (updated.length > 0) {
        await tx.insert(inventoryMovements).values(
          updated.map((item) => ({
            organizationId: ctx.organizationId,
            inventoryId: item.id,
            productId: item.productId,
            locationId: item.locationId,
            movementType: 'adjust' as const,
            quantity: 0, // Status change, not quantity change
            previousQuantity: item.quantityOnHand ?? 0,
            newQuantity: item.quantityOnHand ?? 0,
            metadata: {
              reason: data.reason,
              statusChange: targetStatus,
            },
            createdBy: ctx.user.id,
          }))
        );

        const serializedStatus = mapInventoryStatusToSerializedStatus(targetStatus);
        for (const item of updated) {
          if (!item.serialNumber) {
            continue;
          }

          const serializedItemId = await upsertSerializedItemForInventory(tx, {
            organizationId: ctx.organizationId,
            productId: item.productId,
            serialNumber: item.serialNumber,
            inventoryId: item.id,
            status: serializedStatus,
            userId: ctx.user.id,
          });

          if (serializedItemId) {
            await addSerializedItemEvent(tx, {
              organizationId: ctx.organizationId,
              serializedItemId,
              eventType: 'status_changed',
              entityType: 'inventory',
              entityId: item.id,
              notes: `Bulk status update to ${targetStatus}: ${data.reason}`,
              userId: ctx.user.id,
            });
          }
        }

        // Log activities for bulk status update - inside transaction for atomicity
        // Log one activity per unique product (not per inventory item) to avoid spam
        const productIds = [...new Set(updated.map((item) => item.productId))];
        for (const productId of productIds) {
          await logActivityInTransaction(tx, ctx, {
            entityType: 'product',
            entityId: productId,
            action: 'updated',
            description: `Bulk status update: ${updated.length} items set to ${targetStatus}`,
            metadata: {
              status: targetStatus,
              reason: data.reason,
              itemCount: updated.length,
              inventoryIds: updated.map((item) => item.id),
            },
          });
        }
      }

      return {
        updatedCount: updated.length,
        items: updated,
      };
    });
  });

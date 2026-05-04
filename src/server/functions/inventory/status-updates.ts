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
import {
  inventory,
  inventoryMovements,
} from 'drizzle/schema';
import {
  logActivityInTransaction,
} from '@/server/functions/inventory/_activity';

const bulkUpdateStatusSchema = z.object({
  inventoryIds: z.array(z.string().uuid()).min(1).max(100),
  status: inventoryStatusSchema,
  reason: z.string().min(1),
});

/**
 * Bulk update inventory status.
 */
export const bulkUpdateStatus = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Update all items
      const updated = await tx
        .update(inventory)
        .set({
          status: data.status,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            inArray(inventory.id, data.inventoryIds)
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
              statusChange: data.status,
            },
            createdBy: ctx.user.id,
          }))
        );

        // Log activities for bulk status update - inside transaction for atomicity
        // Log one activity per unique product (not per inventory item) to avoid spam
        const productIds = [...new Set(updated.map((item) => item.productId))];
        for (const productId of productIds) {
          await logActivityInTransaction(tx, ctx, {
            entityType: 'product',
            entityId: productId,
            action: 'updated',
            description: `Bulk status update: ${updated.length} items set to ${data.status}`,
            metadata: {
              status: data.status,
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

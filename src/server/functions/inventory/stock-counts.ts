/**
 * Stock Counting Server Functions
 *
 * Cycle counting lifecycle management with planning and count-item mutation.
 * Read and analytics functions are re-exported from `stock-counts-read.ts`.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, asc, ne, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  stockCounts,
  stockCountItems,
  inventory,
  warehouseLocations,
  products,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import {
  createStockCountSchema,
  updateStockCountSchema,
  updateStockCountItemSchema,
} from '@/lib/schemas/inventory';
import { completeStockCountReconciliation } from './complete-stock-count-reconciliation';
import { stockCountProductJoinCondition } from './stock-counts-shared';

// ============================================================================
// STOCK COUNT CRUD
// ============================================================================

/**
 * Create a new stock count.
 */
export const createStockCount = createServerFn({ method: 'POST' })
  .inputValidator(createStockCountSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    // Check for duplicate count code
    const [existing] = await db
      .select()
      .from(stockCounts)
      .where(
        and(
          eq(stockCounts.organizationId, ctx.organizationId),
          eq(stockCounts.countCode, data.countCode)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError(`Stock count with code '${data.countCode}' already exists`);
    }

    // Validate location if specified
    if (data.locationId) {
      const [location] = await db
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.id, data.locationId),
            eq(warehouseLocations.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!location) {
        throw new NotFoundError('Location not found', 'warehouseLocation');
      }
    }

    const [count] = await db
      .insert(stockCounts)
      .values({
        organizationId: ctx.organizationId,
        countCode: data.countCode,
        countType: data.countType,
        locationId: data.locationId,
        assignedTo: data.assignedTo,
        varianceThreshold: data.varianceThreshold ? String(data.varianceThreshold) : undefined,
        notes: data.notes,
        metadata: data.metadata,
        status: 'draft',
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { count };
  });

/**
 * Update a stock count.
 */
export const updateStockCount = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateStockCountSchema,
    })
  )
  .handler(async ({ data: { id, data } }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [existing] = await tx
        .select()
        .from(stockCounts)
        .where(and(eq(stockCounts.id, id), eq(stockCounts.organizationId, ctx.organizationId)))
        .for('update')
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Stock count not found', 'stockCount');
      }

      if (existing.status !== 'draft') {
        throw new ValidationError(`Cannot update ${existing.status} stock count`, {
          status: ['Count must be in draft status'],
        });
      }

      // Check for duplicate count code if changing
      if (data.countCode && data.countCode !== existing.countCode) {
        const [duplicate] = await tx
          .select()
          .from(stockCounts)
          .where(
            and(
              eq(stockCounts.organizationId, ctx.organizationId),
              eq(stockCounts.countCode, data.countCode),
              ne(stockCounts.id, id)
            )
          )
          .limit(1);

        if (duplicate) {
          throw new ConflictError(`Stock count with code '${data.countCode}' already exists`);
        }
      }

      // Validate updated location if changing
      if (data.locationId !== undefined) {
        const [location] = await tx
          .select({ id: warehouseLocations.id })
          .from(warehouseLocations)
          .where(
            and(
              eq(warehouseLocations.id, data.locationId),
              eq(warehouseLocations.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!location) {
          throw new NotFoundError('Location not found', 'warehouseLocation');
        }
      }

      const [count] = await tx
        .update(stockCounts)
        .set({
          ...(data.countCode !== undefined && { countCode: data.countCode }),
          ...(data.countType !== undefined && { countType: data.countType }),
          ...(data.locationId !== undefined && { locationId: data.locationId }),
          ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
          ...(data.varianceThreshold !== undefined && {
            varianceThreshold: String(data.varianceThreshold),
          }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`${stockCounts.version} + 1`,
        })
        .where(and(eq(stockCounts.id, id), eq(stockCounts.organizationId, ctx.organizationId)))
        .returning();

      return { count };
    });
  });

// ============================================================================
// STOCK COUNT LIFECYCLE
// ============================================================================

/**
 * Start a stock count and generate count sheet.
 */
export const startStockCount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [count] = await tx
        .select()
        .from(stockCounts)
        .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
        .for('update')
        .limit(1);

      if (!count) {
        throw new NotFoundError('Stock count not found', 'stockCount');
      }

      if (count.status !== 'draft') {
        throw new ValidationError(`Cannot start count in ${count.status} status`, {
          status: ['Count must be in draft status to start'],
        });
      }

      // Get inventory items to count
      const inventoryConditions = [eq(inventory.organizationId, ctx.organizationId)];

      if (count.locationId) {
        inventoryConditions.push(eq(inventory.locationId, count.locationId));
      }

      // OPTIMIZED: Only select fields needed for stock count items
      const inventoryItems = await tx
        .select({
          id: inventory.id,
          productId: inventory.productId,
          locationId: inventory.locationId,
          quantityOnHand: inventory.quantityOnHand,
        })
        .from(inventory)
        .where(and(...inventoryConditions));

      if (inventoryItems.length === 0) {
        throw new ValidationError('No inventory items found for this count', {
          locationId: ['No inventory in this location'],
        });
      }

      // Update count status
      const [updatedCount] = await tx
        .update(stockCounts)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`${stockCounts.version} + 1`,
        })
        .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
        .returning();

      // Create count items
      const countItems = await tx
        .insert(stockCountItems)
        .values(
          inventoryItems.map((inv) => ({
            stockCountId: data.id,
            inventoryId: inv.id,
            expectedQuantity: inv.quantityOnHand ?? 0,
          }))
        )
        .returning();

      const enrichedItems = await tx
        .select({
          item: stockCountItems,
          inventoryItem: inventory,
          product: products,
          location: warehouseLocations,
        })
        .from(stockCountItems)
        .leftJoin(
          inventory,
          and(
            eq(stockCountItems.inventoryId, inventory.id),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .leftJoin(
          products,
          stockCountProductJoinCondition(ctx.organizationId)
        )
        .leftJoin(
          warehouseLocations,
          and(
            eq(inventory.locationId, warehouseLocations.id),
            eq(warehouseLocations.organizationId, ctx.organizationId)
          )
        )
        .where(eq(stockCountItems.stockCountId, data.id))
        .orderBy(asc(stockCountItems.createdAt));

      return {
        count: updatedCount,
        items: enrichedItems.map(({ item, inventoryItem, product, location }) => ({
          ...item,
          inventory: inventoryItem ?? null,
          product: product ?? null,
          location: location ?? null,
        })),
        progress: {
          totalItems: countItems.length,
          countedItems: 0,
          pendingItems: countItems.length,
          varianceItems: 0,
          completionPercentage: 0,
        },
      };
    });
  });

/**
 * Update a count item with counted quantity.
 */
export const updateStockCountItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      countId: z.string().uuid(),
      itemId: z.string().uuid(),
      data: updateStockCountItemSchema,
    })
  )
  .handler(async ({ data: { countId, itemId, data } }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [count] = await tx
        .select()
        .from(stockCounts)
        .where(and(eq(stockCounts.id, countId), eq(stockCounts.organizationId, ctx.organizationId)))
        .for('update')
        .limit(1);

      if (!count) {
        throw new NotFoundError('Stock count not found', 'stockCount');
      }

      if (count.status !== 'in_progress') {
        throw new ValidationError(`Cannot update items for ${count.status} count`, {
          status: ['Count must be in progress'],
        });
      }

      const [item] = await tx
        .select()
        .from(stockCountItems)
        .where(and(eq(stockCountItems.id, itemId), eq(stockCountItems.stockCountId, countId)))
        .limit(1);

      if (!item) {
        throw new NotFoundError('Stock count item not found', 'stockCountItem');
      }

      const [updatedItem] = await tx
        .update(stockCountItems)
        .set({
          ...data,
          countedBy: data.countedQuantity !== undefined ? ctx.user.id : item.countedBy,
          countedAt: data.countedQuantity !== undefined ? new Date() : item.countedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(stockCountItems.id, itemId), eq(stockCountItems.stockCountId, countId)))
        .returning();

      return { item: updatedItem };
    });
  });

/**
 * Bulk update count items (for barcode scanning).
 */
export const bulkUpdateCountItems = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      countId: z.string().uuid(),
      items: z
        .array(
          z.object({
            itemId: z.string().uuid(),
            countedQuantity: z.number().int().min(0),
            varianceReason: z.string().optional(),
          })
        )
        .min(1)
        .max(100),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [count] = await tx
        .select()
        .from(stockCounts)
        .where(
          and(eq(stockCounts.id, data.countId), eq(stockCounts.organizationId, ctx.organizationId))
        )
        .for('update')
        .limit(1);

      if (!count) {
        throw new NotFoundError('Stock count not found', 'stockCount');
      }

      if (count.status !== 'in_progress') {
        throw new ValidationError(`Cannot update items for ${count.status} count`, {
          status: ['Count must be in progress'],
        });
      }

      // OPTIMIZED: Use bulk update with CASE statement instead of loop
      // This reduces N sequential updates to a single update query
      if (data.items.length === 0) {
        return { updatedCount: 0, items: [] };
      }

      // Build CASE statements for bulk update
      const itemIds = data.items.map((i) => i.itemId);
      const caseStatements = {
        countedQuantity: sql`CASE ${stockCountItems.id}
          ${sql.join(
            data.items.map(
              (item) => sql`WHEN ${item.itemId} THEN ${item.countedQuantity}`
            ),
            sql` `
          )}
          ELSE ${stockCountItems.countedQuantity}
        END`,
        varianceReason: sql`CASE ${stockCountItems.id}
          ${sql.join(
            data.items.map(
              (item) =>
                sql`WHEN ${item.itemId} THEN ${item.varianceReason ?? sql`NULL`}`
            ),
            sql` `
          )}
          ELSE ${stockCountItems.varianceReason}
        END`,
      };

      // Bulk update all items
      await tx
        .update(stockCountItems)
        .set({
          countedQuantity: caseStatements.countedQuantity,
          varianceReason: caseStatements.varianceReason,
          countedBy: ctx.user.id,
          countedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stockCountItems.stockCountId, data.countId),
            inArray(stockCountItems.id, itemIds)
          )
        );

      // Fetch updated items
      const updated = await tx
        .select()
        .from(stockCountItems)
        .where(
          and(
            eq(stockCountItems.stockCountId, data.countId),
            inArray(stockCountItems.id, itemIds)
          )
        );

      return {
        updatedCount: updated.length,
        items: updated,
      };
    });
  });

/**
 * Complete a stock count and create adjustments.
 */
export const completeStockCount = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      notes: z.string().optional(),
      applyAdjustments: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return completeStockCountReconciliation({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });

/**
 * Cancel a stock count.
 */
export const cancelStockCount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [count] = await tx
        .select()
        .from(stockCounts)
        .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
        .for('update')
        .limit(1);

      if (!count) {
        throw new NotFoundError('Stock count not found', 'stockCount');
      }

      if (count.status === 'completed') {
        throw new ValidationError('Cannot cancel a completed stock count', {
          status: ['Count is already completed'],
        });
      }

      const [cancelledCount] = await tx
        .update(stockCounts)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`${stockCounts.version} + 1`,
        })
        .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
        .returning();

      return { count: cancelledCount, success: true };
    });
  });

export {
  getCountHistory,
  getCountVarianceAnalysis,
  getStockCount,
  listStockCounts,
} from './stock-counts-read';

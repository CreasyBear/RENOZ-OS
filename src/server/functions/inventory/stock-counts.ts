/**
 * Stock Counting Server Functions
 *
 * Cycle counting lifecycle management with planning, execution, and variance analysis.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, gte, ne, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  stockCounts,
  stockCountItems,
  inventory,
  inventoryMovements,
  warehouseLocations,
  products,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import {
  createStockCountSchema,
  updateStockCountSchema,
  stockCountListQuerySchema,
  updateStockCountItemSchema,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================


// ============================================================================
// STOCK COUNT CRUD
// ============================================================================

/**
 * List stock counts with filtering.
 */
export const listStockCounts = createServerFn({ method: 'GET' })
  .inputValidator(stockCountListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    const { page = 1, pageSize = 20, sortBy: _sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(stockCounts.organizationId, ctx.organizationId)];

    if (filters.status) {
      conditions.push(eq(stockCounts.status, filters.status));
    }
    if (filters.countType) {
      conditions.push(eq(stockCounts.countType, filters.countType));
    }
    if (filters.locationId) {
      conditions.push(eq(stockCounts.locationId, filters.locationId));
    }
    if (filters.assignedTo) {
      conditions.push(eq(stockCounts.assignedTo, filters.assignedTo));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockCounts)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Build order clause
    const orderDir = sortOrder === 'asc' ? asc : desc;

    // Get counts with pagination
    const offset = (page - 1) * limit;
    const counts = await db
      .select()
      .from(stockCounts)
      .where(and(...conditions))
      .orderBy(orderDir(stockCounts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      counts,
      total,
      page,
      limit,
      hasMore: offset + counts.length < total,
    };
  });

/**
 * Get single stock count with items and progress.
 */
export const getStockCount = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    // Get items with inventory and product details
    const itemRows = await db
      .select({
        item: stockCountItems,
        inventoryItem: inventory,
        product: products,
        location: warehouseLocations,
      })
      .from(stockCountItems)
      .leftJoin(inventory, eq(stockCountItems.inventoryId, inventory.id))
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
      .where(eq(stockCountItems.stockCountId, data.id))
      .orderBy(asc(stockCountItems.createdAt));

    const items = itemRows.map(({ item, inventoryItem, product, location }) => ({
      ...item,
      inventory: inventoryItem ?? null,
      product: product ?? null,
      location: location ?? null,
    }));

    // Get location if specified
    const location = count.locationId
      ? await db
          .select()
          .from(warehouseLocations)
          .where(eq(warehouseLocations.id, count.locationId))
          .limit(1)
          .then((r) => r[0] || null)
      : null;

    // Calculate progress
    const totalItems = items.length;
    const countedItems = items.filter((i) => i.countedQuantity !== null).length;
    const varianceItems = items.filter(
      (i) => i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity
    ).length;

    return {
      count: {
        ...count,
        items,
        location,
      },
      progress: {
        totalItems,
        countedItems,
        pendingItems: totalItems - countedItems,
        varianceItems,
        completionPercentage: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0,
      },
    };
  });

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

    const [existing] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    // Cannot update completed or cancelled counts
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new ValidationError(`Cannot update ${existing.status} stock count`, {
        status: [`Count is already ${existing.status}`],
      });
    }

    // Check for duplicate count code if changing
    if (data.countCode && data.countCode !== existing.countCode) {
      const [duplicate] = await db
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

    const [count] = await db
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
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${stockCounts.version} + 1`,
      })
      .where(eq(stockCounts.id, id))
      .returning();

    return { count };
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

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status !== 'draft') {
      throw new ValidationError(`Cannot start count in ${count.status} status`, {
        status: ['Count must be in draft status to start'],
      });
    }

    return await db.transaction(async (tx) => {
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
        .where(eq(stockCounts.id, data.id))
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
        .leftJoin(inventory, eq(stockCountItems.inventoryId, inventory.id))
        .leftJoin(products, eq(inventory.productId, products.id))
        .leftJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
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

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, countId), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status !== 'in_progress') {
      throw new ValidationError(`Cannot update items for ${count.status} count`, {
        status: ['Count must be in progress'],
      });
    }

    // Find the item
    const [item] = await db
      .select()
      .from(stockCountItems)
      .where(and(eq(stockCountItems.id, itemId), eq(stockCountItems.stockCountId, countId)))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Stock count item not found', 'stockCountItem');
    }

    // Update the item
    const [updatedItem] = await db
      .update(stockCountItems)
      .set({
        ...data,
        countedBy: data.countedQuantity !== undefined ? ctx.user.id : item.countedBy,
        countedAt: data.countedQuantity !== undefined ? new Date() : item.countedAt,
        updatedAt: new Date(),
      })
      .where(eq(stockCountItems.id, itemId))
      .returning();

    return { item: updatedItem };
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

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(stockCounts)
      .where(
        and(eq(stockCounts.id, data.countId), eq(stockCounts.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status !== 'in_progress') {
      throw new ValidationError(`Cannot update items for ${count.status} count`, {
        status: ['Count must be in progress'],
      });
    }

    return await db.transaction(async (tx) => {
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

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status !== 'in_progress') {
      throw new ValidationError(`Cannot complete count in ${count.status} status`, {
        status: ['Count must be in progress'],
      });
    }

    // Get all count items
    const items = await db
      .select()
      .from(stockCountItems)
      .where(eq(stockCountItems.stockCountId, data.id));

    // Check if all items are counted
    const uncountedItems = items.filter((i) => i.countedQuantity === null);
    if (uncountedItems.length > 0) {
      throw new ValidationError(`${uncountedItems.length} items have not been counted`, {
        items: ['All items must be counted before completing'],
      });
    }

    return await db.transaction(async (tx) => {
      // Find items with variance
      const varianceItems = items.filter((i) => i.countedQuantity !== i.expectedQuantity);

      const adjustments: (typeof inventoryMovements.$inferSelect)[] = [];

      if (data.applyAdjustments && varianceItems.length > 0) {
        // OPTIMIZED: Fetch all inventory records in one query instead of N queries
        const inventoryIds = varianceItems.map((item) => item.inventoryId);
        const inventoryRecords = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.organizationId, ctx.organizationId),
              inArray(inventory.id, inventoryIds)
            )
          );

        // Create map for O(1) lookup
        const inventoryMap = new Map(inventoryRecords.map((inv) => [inv.id, inv]));

        // Filter to only items with valid inventory records
        const validVarianceItems = varianceItems.filter((item) => inventoryMap.has(item.inventoryId));

        if (validVarianceItems.length > 0) {
          // OPTIMIZED: Bulk update inventory using CASE statements
          const inventoryCaseStatements = {
            quantityOnHand: sql`CASE ${inventory.id}
              ${sql.join(
                validVarianceItems.map((item) => {
                  const inv = inventoryMap.get(item.inventoryId)!;
                  const variance = (item.countedQuantity ?? 0) - item.expectedQuantity;
                  const newQuantity = (inv.quantityOnHand ?? 0) + variance;
                  return sql`WHEN ${item.inventoryId} THEN ${newQuantity}`;
                }),
                sql` `
              )}
              ELSE ${inventory.quantityOnHand}
            END`,
            totalValue: sql`CASE ${inventory.id}
              ${sql.join(
                validVarianceItems.map((item) => {
                  const inv = inventoryMap.get(item.inventoryId)!;
                  const variance = (item.countedQuantity ?? 0) - item.expectedQuantity;
                  const newQuantity = (inv.quantityOnHand ?? 0) + variance;
                  return sql`WHEN ${item.inventoryId} THEN ${newQuantity} * COALESCE(${inventory.unitCost}, 0)`;
                }),
                sql` `
              )}
              ELSE ${inventory.totalValue}
            END`,
          };

          await tx
            .update(inventory)
            .set({
              quantityOnHand: inventoryCaseStatements.quantityOnHand,
              totalValue: inventoryCaseStatements.totalValue,
              updatedAt: new Date(),
              updatedBy: ctx.user.id,
            })
            .where(
              and(
                eq(inventory.organizationId, ctx.organizationId),
                inArray(inventory.id, validVarianceItems.map((item) => item.inventoryId))
              )
            );

          // OPTIMIZED: Bulk insert movements
          const movementValues = validVarianceItems.map((item) => {
            const inv = inventoryMap.get(item.inventoryId)!;
            const variance = (item.countedQuantity ?? 0) - item.expectedQuantity;
            const newQuantity = (inv.quantityOnHand ?? 0) + variance;
            return {
              organizationId: ctx.organizationId,
              inventoryId: item.inventoryId,
              productId: inv.productId,
              locationId: inv.locationId,
              movementType: 'adjust' as const,
              quantity: variance,
              previousQuantity: inv.quantityOnHand ?? 0,
              newQuantity,
              referenceType: 'count' as const,
              referenceId: data.id,
              metadata: {
                countCode: count.countCode,
                varianceReason: item.varianceReason ?? undefined,
              },
              notes: item.varianceReason ?? `Count adjustment from ${count.countCode}`,
              createdBy: ctx.user.id,
            };
          });

          const insertedMovements = await tx
            .insert(inventoryMovements)
            .values(movementValues)
            .returning();

          adjustments.push(...insertedMovements);

          // OPTIMIZED: Bulk update stock count items
          await tx
            .update(stockCountItems)
            .set({
              reviewedBy: ctx.user.id,
              reviewedAt: new Date(),
            })
            .where(
              and(
                eq(stockCountItems.stockCountId, data.id),
                inArray(
                  stockCountItems.id,
                  validVarianceItems.map((item) => item.id)
                )
              )
            );
        }
      }

      // Update count status
      const [completedCount] = await tx
        .update(stockCounts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          notes: data.notes || count.notes,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`${stockCounts.version} + 1`,
        })
        .where(eq(stockCounts.id, data.id))
        .returning();

      return {
        count: completedCount,
        adjustments,
        summary: {
          totalItems: items.length,
          varianceItems: varianceItems.length,
          adjustmentsMade: adjustments.length,
        },
      };
    });
  });

/**
 * Cancel a stock count.
 */
export const cancelStockCount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.count });

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    if (count.status === 'completed') {
      throw new ValidationError('Cannot cancel a completed stock count', {
        status: ['Count is already completed'],
      });
    }

    // Update status to cancelled
    const [cancelledCount] = await db
      .update(stockCounts)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${stockCounts.version} + 1`,
      })
      .where(eq(stockCounts.id, data.id))
      .returning();

    return { count: cancelledCount, success: true };
  });

// ============================================================================
// VARIANCE ANALYSIS
// ============================================================================

/**
 * Get variance analysis for a stock count.
 */
export const getCountVarianceAnalysis = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const [count] = await db
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, data.id), eq(stockCounts.organizationId, ctx.organizationId)))
      .limit(1);

    if (!count) {
      throw new NotFoundError('Stock count not found', 'stockCount');
    }

    // Get items with variance details
    const items = await db
      .select({
        item: stockCountItems,
        inventory: inventory,
        product: products,
      })
      .from(stockCountItems)
      .innerJoin(inventory, eq(stockCountItems.inventoryId, inventory.id))
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(eq(stockCountItems.stockCountId, data.id));

    // Calculate variance statistics
    const varianceItems = items
      .filter((i) => i.item.countedQuantity !== null)
      .map((i) => ({
        ...i.item,
        product: i.product,
        inventory: i.inventory,
        variance: (i.item.countedQuantity ?? 0) - i.item.expectedQuantity,
        variancePercent:
          i.item.expectedQuantity > 0
            ? Math.round(
                (((i.item.countedQuantity ?? 0) - i.item.expectedQuantity) /
                  i.item.expectedQuantity) *
                  100
              )
            : 0,
        valueImpact:
          ((i.item.countedQuantity ?? 0) - i.item.expectedQuantity) *
          Number(i.inventory.unitCost ?? 0),
      }));

    const itemsWithVariance = varianceItems.filter((i) => i.variance !== 0);

    // Summary statistics
    const totalExpected = varianceItems.reduce((sum, i) => sum + i.expectedQuantity, 0);
    const totalCounted = varianceItems.reduce((sum, i) => sum + (i.countedQuantity ?? 0), 0);
    const totalValueImpact = itemsWithVariance.reduce((sum, i) => sum + i.valueImpact, 0);

    return {
      count,
      items: varianceItems,
      summary: {
        totalItems: varianceItems.length,
        itemsWithVariance: itemsWithVariance.length,
        accuracyRate:
          varianceItems.length > 0
            ? Math.round(
                ((varianceItems.length - itemsWithVariance.length) / varianceItems.length) * 100
              )
            : 100,
        totalExpected,
        totalCounted,
        netVariance: totalCounted - totalExpected,
        totalValueImpact,
        positiveVariances: itemsWithVariance.filter((i) => i.variance > 0).length,
        negativeVariances: itemsWithVariance.filter((i) => i.variance < 0).length,
      },
    };
  });

/**
 * Get count history for trending analysis.
 */
export const getCountHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      locationId: z.string().uuid().optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const conditions = [
      eq(stockCounts.organizationId, ctx.organizationId),
      eq(stockCounts.status, 'completed'),
    ];

    if (data.locationId) {
      conditions.push(eq(stockCounts.locationId, data.locationId));
    }
    if (data.dateFrom) {
      conditions.push(gte(stockCounts.completedAt, data.dateFrom));
    }
    if (data.dateTo) {
      conditions.push(sql`${stockCounts.completedAt} <= ${data.dateTo}`);
    }

    const counts = await db
      .select({
        id: stockCounts.id,
        organizationId: stockCounts.organizationId,
        countCode: stockCounts.countCode,
        countType: stockCounts.countType,
        locationId: stockCounts.locationId,
        assignedTo: stockCounts.assignedTo,
        status: stockCounts.status,
        varianceThreshold: stockCounts.varianceThreshold,
        startedAt: stockCounts.startedAt,
        completedAt: stockCounts.completedAt,
        approvedBy: stockCounts.approvedBy,
        approvedAt: stockCounts.approvedAt,
        notes: stockCounts.notes,
        metadata: stockCounts.metadata,
        createdAt: stockCounts.createdAt,
        updatedAt: stockCounts.updatedAt,
        createdBy: stockCounts.createdBy,
        updatedBy: stockCounts.updatedBy,
        version: stockCounts.version,
      })
      .from(stockCounts)
      .where(and(...conditions))
      .orderBy(desc(stockCounts.completedAt))
      .limit(data.limit);

    // OPTIMIZED: Get variance stats for all counts in a single aggregation query
    // Instead of N+1 queries (one per count), use GROUP BY with IN clause
    const countIds = counts.map((c) => c.id);
    const statsByCountId = countIds.length > 0
      ? await db
          .select({
            stockCountId: stockCountItems.stockCountId,
            totalItems: sql<number>`COUNT(*)::int`,
            varianceItems: sql<number>`COUNT(*) FILTER (WHERE ${stockCountItems.countedQuantity} != ${stockCountItems.expectedQuantity})::int`,
          })
          .from(stockCountItems)
          .where(inArray(stockCountItems.stockCountId, countIds))
          .groupBy(stockCountItems.stockCountId)
      : [];

    // Create map for O(1) lookup
    const statsMap = new Map(
      statsByCountId.map((s) => [
        s.stockCountId,
        {
          totalItems: s.totalItems ?? 0,
          varianceItems: s.varianceItems ?? 0,
          accuracyRate:
            s.totalItems && s.totalItems > 0
              ? Math.round(((s.totalItems - s.varianceItems) / s.totalItems) * 100)
              : 100,
        },
      ])
    );

    // Combine counts with stats
    const historyWithStats = counts.map((count) => {
      const stats = statsMap.get(count.id) ?? {
        totalItems: 0,
        varianceItems: 0,
        accuracyRate: 100,
      };
      return {
        ...count,
        ...stats,
      };
    });

    return { counts: historyWithStats };
  });

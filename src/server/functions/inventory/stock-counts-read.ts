/**
 * Stock count read server functions.
 *
 * Owns list/detail, variance analysis, and completed count history reads.
 * Lifecycle and count item mutations stay in `stock-counts.ts`.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  inventory,
  products,
  stockCountItems,
  stockCounts,
  warehouseLocations,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import { stockCountListQuerySchema } from '@/lib/schemas/inventory';
import { stockCountProductJoinCondition } from './stock-counts-shared';

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
  .inputValidator(normalizeObjectInput(z.object({ id: z.string().uuid() })))
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
          .where(
            and(
              eq(warehouseLocations.id, count.locationId),
              eq(warehouseLocations.organizationId, ctx.organizationId)
            )
          )
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
 * Get variance analysis for a stock count.
 */
export const getCountVarianceAnalysis = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ id: z.string().uuid() })))
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
      .innerJoin(
        inventory,
        and(
          eq(stockCountItems.inventoryId, inventory.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .innerJoin(
        products,
        stockCountProductJoinCondition(ctx.organizationId)
      )
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
    normalizeObjectInput(
      z.object({
        locationId: z.string().uuid().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
    )
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

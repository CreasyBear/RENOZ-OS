/**
 * Inventory WMS dashboard server functions.
 *
 * Owns warehouse aggregate reads: stock by category/location, recent WMS
 * movement timeline, and the combined WMS dashboard query.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  WMS_DASHBOARD_COMPARISON_UNITS,
  WMS_DASHBOARD_STOCK_SEMANTICS,
  type CategoryStock,
  type LocationStock,
  type RecentMovement,
  type WMSDashboardComparisonUnits,
} from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { inventoryLogger } from '@/lib/logger';
import {
  inventory,
  inventoryMovements,
  products,
  warehouseLocations as locations,
} from 'drizzle/schema';
import { allocatableStockCountSql } from './_allocatable-stock-sql';

/**
 * Get stock aggregated by product category.
 * Returns unit counts and total value per category.
 */
export const getStockByCategory = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

  // Import categories table
  const { categories } = await import('drizzle/schema');

  // Aggregate inventory by product category
  const results = await db
    .select({
      categoryId: products.categoryId,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      unitCount: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(inventory.organizationId, ctx.organizationId))
    .groupBy(products.categoryId, categories.name)
    .orderBy(desc(sql`SUM(${inventory.totalValue})`));

  const categoryStock: CategoryStock[] = results.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    unitCount: Number(row.unitCount),
    totalValue: Number(row.totalValue),
  }));

  return categoryStock;
});

/**
 * Get stock aggregated by warehouse location.
 * Returns value, unit count, and percentage of total per location.
 */
export const getStockByLocation = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

  // Get total inventory value for percentage calculation
  const [totalsResult] = await db
    .select({
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
    })
    .from(inventory)
    .where(eq(inventory.organizationId, ctx.organizationId));

  const grandTotal = Number(totalsResult?.totalValue ?? 0);

  // Aggregate by location
  const results = await db
    .select({
      locationId: locations.id,
      locationName: locations.name,
      locationType: locations.locationType,
      unitCount: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
    })
    .from(inventory)
    .innerJoin(locations, eq(inventory.locationId, locations.id))
    .where(eq(inventory.organizationId, ctx.organizationId))
    .groupBy(locations.id, locations.name, locations.locationType)
    .orderBy(desc(sql`SUM(${inventory.totalValue})`));

  const locationStock: LocationStock[] = results.map((row) => ({
    locationId: row.locationId,
    locationName: row.locationName,
    locationType: row.locationType ?? 'warehouse',
    unitCount: Number(row.unitCount),
    totalValue: Number(row.totalValue),
    percentage: grandTotal > 0 ? Math.round((Number(row.totalValue) / grandTotal) * 100) : 0,
  }));

  return locationStock;
});

/**
 * Get recent inventory movements for the timeline display.
 * Maps movement types to receipt/transfer/allocation for simpler UI.
 */
export const getRecentMovementsTimeline = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    // Get recent movements with product and location details
    const results = await db
      .select({
        id: inventoryMovements.id,
        movementType: inventoryMovements.movementType,
        quantity: inventoryMovements.quantity,
        createdAt: inventoryMovements.createdAt,
        referenceType: inventoryMovements.referenceType,
        referenceId: inventoryMovements.referenceId,
        metadata: inventoryMovements.metadata,
        notes: inventoryMovements.notes,
        productName: products.name,
        productSku: products.sku,
        locationName: locations.name,
        locationCode: locations.locationCode,
      })
      .from(inventoryMovements)
      .leftJoin(products, eq(inventoryMovements.productId, products.id))
      .leftJoin(locations, eq(inventoryMovements.locationId, locations.id))
      .where(eq(inventoryMovements.organizationId, ctx.organizationId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(data.limit);

    // Map movement types to simpler categories
    const typeMap: Record<string, 'receipt' | 'transfer' | 'allocation'> = {
      receive: 'receipt',
      transfer: 'transfer',
      allocate: 'allocation',
      deallocate: 'allocation',
      pick: 'allocation',
      ship: 'allocation',
      adjust: 'receipt', // Adjustments shown as receipts for simplicity
      return: 'receipt',
    };

    const movements: RecentMovement[] = results.map((row) => {
      const metadata = row.metadata as { toLocationId?: string; fromLocationId?: string } | null;
      const type = typeMap[row.movementType] ?? 'receipt';

      // Build description
      let description: string = row.movementType;
      if (row.referenceType) {
        description = `${row.movementType} (${row.referenceType})`;
      }

      return {
        id: row.id,
        type,
        timestamp: row.createdAt,
        description,
        reference: row.referenceId ?? null,
        quantity: Math.abs(Number(row.quantity ?? 0)),
        productName: row.productName ?? 'Unknown Product',
        productSku: row.productSku ?? '',
        location: row.locationName ?? row.locationCode ?? 'Unknown',
        toLocation: metadata?.toLocationId ?? null,
      };
    });

    return movements;
  });

/**
 * Get complete WMS dashboard data in a single query.
 * Combines: total value, category breakdown, location breakdown, and recent movements.
 */
export const getWMSDashboard = createServerFn({ method: 'POST' })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    try {
      const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
      inventoryLogger.debug('[getWMSDashboard] auth ok', {
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
      });

      // Import categories table
      const { categories } = await import('drizzle/schema');

      // Calculate comparison period (30 days ago)
      const comparisonDate = sql`NOW() - INTERVAL '30 days'`;

      // Build CTEs for historical inventory reconstruction
      // Date floor: only consider movements within last 2 years for historical reconstruction
      const dateFloor = sql`NOW() - INTERVAL '2 years'`;

      const historicalQuantity = db.$with('historical_quantity').as(
        db
          .select({
            productId: inventoryMovements.productId,
            netQuantity: sql<number>`COALESCE(SUM(${inventoryMovements.quantity}), 0)`.as('net_quantity'),
          })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.organizationId, ctx.organizationId),
              lt(inventoryMovements.createdAt, comparisonDate),
              sql`${inventoryMovements.createdAt} > ${dateFloor}`
            )
          )
          .groupBy(inventoryMovements.productId)
      );

      const historicalCost = db.$with('historical_cost').as(
        db
          .select({
            productId: inventoryMovements.productId,
            avgUnitCost: sql<number>`
              CASE
                WHEN SUM(CASE WHEN ${inventoryMovements.quantity} > 0 AND ${inventoryMovements.unitCost} IS NOT NULL THEN ${inventoryMovements.quantity} ELSE 0 END) > 0
                THEN SUM(CASE WHEN ${inventoryMovements.quantity} > 0 AND ${inventoryMovements.unitCost} IS NOT NULL THEN ${inventoryMovements.unitCost} * ${inventoryMovements.quantity} ELSE 0 END) /
                    SUM(CASE WHEN ${inventoryMovements.quantity} > 0 AND ${inventoryMovements.unitCost} IS NOT NULL THEN ${inventoryMovements.quantity} ELSE 0 END)
                ELSE NULL
              END
            `.as('avg_unit_cost'),
          })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.organizationId, ctx.organizationId),
              lt(inventoryMovements.createdAt, comparisonDate),
              sql`${inventoryMovements.createdAt} > ${dateFloor}`
            )
          )
          .groupBy(inventoryMovements.productId)
      );

      const historicalInventory = db.$with('historical_inventory').as(
        db
          .select({
            productId: historicalQuantity.productId,
            netQuantity: historicalQuantity.netQuantity,
            unitCost: sql<number>`COALESCE(${historicalCost.avgUnitCost}, 0)`.as('unit_cost'),
            totalValue: sql<number>`${historicalQuantity.netQuantity} * COALESCE(${historicalCost.avgUnitCost}, 0)`.as('total_value'),
          })
          .from(historicalQuantity)
          .leftJoin(historicalCost, eq(historicalQuantity.productId, historicalCost.productId))
          .where(sql`${historicalQuantity.netQuantity} > 0`)
      );

      // Run all queries in parallel for optimal performance
      const [
        totalsResult,
        previousTotalsResult,
        currentAlertsResult,
        previousAlertsResult,
        categoryResults,
        locationResults,
        movementResults,
      ] = await Promise.all([
        // Current total inventory value and units
        db
          .select({
            totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
            totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
            totalSkus: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
          })
          .from(inventory)
          .where(eq(inventory.organizationId, ctx.organizationId)),

        // Previous period totals (reconstructed from movements using CTEs)
        db
          .with(historicalQuantity, historicalCost, historicalInventory)
          .select({
            totalValue: sql<number>`COALESCE(SUM(${historicalInventory.totalValue}), 0)::numeric`,
            totalUnits: sql<number>`COALESCE(SUM(${historicalInventory.netQuantity}), 0)::int`,
            totalSkus: sql<number>`COUNT(DISTINCT ${historicalInventory.productId})::int`,
          })
          .from(historicalInventory),

        // Current alerts count (low stock + out of stock)
        db
          .select({
            lowStockCount: allocatableStockCountSql(ctx.organizationId, 'low_stock'),
            outOfStockCount: allocatableStockCountSql(ctx.organizationId, 'out_of_stock'),
          })
          .from(inventory)
          .where(eq(inventory.organizationId, ctx.organizationId)),

        // Previous period alerts are movement-reconstructed quantity signals.
        // Movement rows do not preserve inventory-row status, so current alerts
        // remain the only allocatable-availability alert contract in this query.
        db
          .with(historicalQuantity)
          .select({
            lowStockCount: sql<number>`
              COUNT(DISTINCT CASE
                WHEN ${historicalQuantity.netQuantity} < ${DEFAULT_LOW_STOCK_THRESHOLD}
                AND ${historicalQuantity.netQuantity} > 0
                THEN ${historicalQuantity.productId}
              END)::int
            `.as('low_stock_count'),
            outOfStockCount: sql<number>`
              COUNT(DISTINCT CASE
                WHEN ${historicalQuantity.netQuantity} <= 0
                THEN ${historicalQuantity.productId}
              END)::int
            `.as('out_of_stock_count'),
          })
          .from(historicalQuantity),

        // Stock by category
        db
          .select({
            categoryId: products.categoryId,
            categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
            unitCount: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
            totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
          })
          .from(inventory)
          .leftJoin(products, eq(inventory.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(inventory.organizationId, ctx.organizationId))
          .groupBy(products.categoryId, categories.name)
          .orderBy(desc(sql`SUM(${inventory.totalValue})`)),

        // Stock by location
        db
          .select({
            locationId: locations.id,
            locationName: locations.name,
            locationType: locations.locationType,
            unitCount: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
            totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
          })
          .from(inventory)
          .innerJoin(
            locations,
            and(
              eq(inventory.locationId, locations.id),
              eq(locations.organizationId, ctx.organizationId)
            )
          )
          .where(eq(inventory.organizationId, ctx.organizationId))
          .groupBy(locations.id, locations.name, locations.locationType)
          .orderBy(desc(sql`SUM(${inventory.totalValue})`)),

        // Recent movements
        db
          .select({
            id: inventoryMovements.id,
            movementType: inventoryMovements.movementType,
            quantity: inventoryMovements.quantity,
            createdAt: inventoryMovements.createdAt,
            referenceType: inventoryMovements.referenceType,
            metadata: inventoryMovements.metadata,
            productName: products.name,
            productSku: products.sku,
            locationName: locations.name,
          })
          .from(inventoryMovements)
          .leftJoin(products, eq(inventoryMovements.productId, products.id))
          .leftJoin(
            locations,
            and(
              eq(inventoryMovements.locationId, locations.id),
              eq(locations.organizationId, ctx.organizationId)
            )
          )
          .where(eq(inventoryMovements.organizationId, ctx.organizationId))
          .orderBy(desc(inventoryMovements.createdAt))
          .limit(10),
      ]);

      const totals = totalsResult[0];
      const previousTotals = previousTotalsResult[0] ?? { totalValue: 0, totalUnits: 0, totalSkus: 0 };
      const currentAlerts = currentAlertsResult[0] ?? { lowStockCount: 0, outOfStockCount: 0 };
      const previousAlerts = previousAlertsResult[0] ?? { lowStockCount: 0, outOfStockCount: 0 };

      // Calculate percentage changes
      const calculatePercentageChange = (previous: number, current: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const currentTotalValue = Number(totals?.totalValue ?? 0);
      const previousTotalValue = Number(previousTotals.totalValue ?? 0);
      const currentTotalUnits = Number(totals?.totalUnits ?? 0);
      const previousTotalUnits = Number(previousTotals.totalUnits ?? 0);
      const currentTotalSkus = Number(totals?.totalSkus ?? 0);
      const previousTotalSkus = Number(previousTotals.totalSkus ?? 0);
      const currentAlertsTotal = (currentAlerts.lowStockCount ?? 0) + (currentAlerts.outOfStockCount ?? 0);
      const previousAlertsTotal = (previousAlerts.lowStockCount ?? 0) + (previousAlerts.outOfStockCount ?? 0);

      // Get current locations count
      const currentLocationsCount = locationResults.length;
      // For previous locations count, we'll use current count (locations don't change frequently)
      // In a real system, you might track location creation dates
      const previousLocationsCount = currentLocationsCount;

      const comparison = {
        totalValueChange: calculatePercentageChange(previousTotalValue, currentTotalValue),
        totalUnitsChange: calculatePercentageChange(previousTotalUnits, currentTotalUnits),
        totalSkusChange: currentTotalSkus - previousTotalSkus,
        alertsChange: currentAlertsTotal - previousAlertsTotal,
        locationsChange: currentLocationsCount - previousLocationsCount,
      };

      const grandTotal = currentTotalValue;

      // Map category results
      const stockByCategory: CategoryStock[] = categoryResults.map((row) => ({
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        unitCount: Number(row.unitCount),
        totalValue: Number(row.totalValue),
      }));

      // Map location results with percentage
      const stockByLocation: LocationStock[] = locationResults.map((row) => ({
        locationId: row.locationId,
        locationName: row.locationName,
        locationType: row.locationType ?? 'warehouse',
        unitCount: Number(row.unitCount),
        totalValue: Number(row.totalValue),
        percentage: grandTotal > 0 ? Math.round((Number(row.totalValue) / grandTotal) * 100) : 0,
      }));

      // Map movement types for timeline
      const typeMap: Record<string, 'receipt' | 'transfer' | 'allocation'> = {
        receive: 'receipt',
        transfer: 'transfer',
        allocate: 'allocation',
        deallocate: 'allocation',
        pick: 'allocation',
        ship: 'allocation',
        adjust: 'receipt',
        return: 'receipt',
      };

      const recentMovements = movementResults.map((row) => {
        const metadata = row.metadata as { toLocationId?: string } | null;
        return {
          id: row.id,
          type: typeMap[row.movementType] ?? 'receipt',
          timestamp: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
          description: row.movementType,
          reference: row.referenceType ?? null,
          quantity: Math.abs(Number(row.quantity ?? 0)),
          productName: row.productName ?? 'Unknown',
          productSku: row.productSku ?? '',
          location: row.locationName ?? 'Unknown',
          toLocation: metadata?.toLocationId ?? null,
        };
      });

      const result = {
        stockSemantics: WMS_DASHBOARD_STOCK_SEMANTICS,
        comparisonUnits: WMS_DASHBOARD_COMPARISON_UNITS as WMSDashboardComparisonUnits,
        totals: {
          totalValue: currentTotalValue,
          totalUnits: currentTotalUnits,
          totalSkus: currentTotalSkus,
        },
        comparison,
        stockByCategory,
        stockByLocation,
        recentMovements,
      };
      inventoryLogger.debug('[getWMSDashboard] success', {
        totalValue: currentTotalValue,
        totalUnits: currentTotalUnits,
        categoriesCount: stockByCategory.length,
        locationsCount: stockByLocation.length,
        movementsCount: recentMovements.length,
      });
      // Ensure response is JSON-serializable (RPC layer)
      try {
        JSON.stringify(result);
      } catch (e) {
        inventoryLogger.error('[getWMSDashboard] JSON serialization failed', e);
        throw e;
      }
      return result;
    } catch (err) {
      inventoryLogger.error('[getWMSDashboard] error', err);
      throw err;
    }
  });

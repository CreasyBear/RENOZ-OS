/**
 * Inventory Server Functions
 *
 * Comprehensive inventory CRUD, adjustments, transfers, and allocation operations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, isNull, gte, lte, inArray, lt, ilike, or } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  inventory,
  inventoryMovements,
  warehouseLocations as locations,
  products,
  inventoryCostLayers,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { containsPattern } from '@/lib/db/utils';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import {
  inventoryListQuerySchema,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type ListInventoryResult,
  type InventoryWithRelations,
} from '@/lib/schemas/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';

export { adjustInventory } from '@/server/functions/inventory/adjustments';
export { allocateInventory, deallocateInventory } from '@/server/functions/inventory/allocations';
export { getInventoryDashboard } from '@/server/functions/inventory/dashboard';
export { listMovements } from '@/server/functions/inventory/movements';
export { receiveInventory } from '@/server/functions/inventory/receiving';
export { getAvailableSerials } from '@/server/functions/inventory/serial-availability';
export { bulkUpdateStatus } from '@/server/functions/inventory/status-updates';
export { transferInventory } from '@/server/functions/inventory/transfers';
export {
  getRecentMovementsTimeline,
  getStockByCategory,
  getStockByLocation,
  getWMSDashboard,
} from '@/server/functions/inventory/wms-dashboard';

// ============================================================================
// TYPES
// ============================================================================

type InventoryMovementRecord = typeof inventoryMovements.$inferSelect;

// ============================================================================
// TYPE HELPERS
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// INVENTORY CRUD
// ============================================================================

/**
 * List inventory items with advanced filtering, sorting, and pagination.
 */
/**
 * Get paginated list of inventory items with filtering and sorting.
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _listInventory = cache(
  async (
    data: z.infer<typeof inventoryListQuerySchema>,
    organizationId: string
  ): Promise<ListInventoryResult> => {
    const { page = 1, pageSize = 20, search, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(inventory.organizationId, organizationId)];

    // Add search filter - searches product name, SKU, lot number, serial number
    // OPTIMIZED: Use LEFT JOIN instead of EXISTS subquery for better performance
    // Note: ILIKE with leading % still can't use indexes, but JOIN is more efficient than EXISTS
    if (search) {
      const searchPattern = containsPattern(search);
      conditions.push(
        or(
          ilike(inventory.lotNumber, searchPattern),
          ilike(inventory.serialNumber, searchPattern),
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern)
        )!
      );
    }

    // Add filter conditions
    if (filters.productId) {
      conditions.push(eq(inventory.productId, filters.productId));
    }
    if (filters.locationId) {
      conditions.push(eq(inventory.locationId, filters.locationId));
    }
    if (filters.status) {
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        conditions.push(inArray(inventory.status, filters.status));
      } else if (!Array.isArray(filters.status)) {
        conditions.push(eq(inventory.status, filters.status));
      }
    }
    if (filters.minQuantity != null) {
      conditions.push(gte(inventory.quantityAvailable, filters.minQuantity));
    }
    if (filters.maxQuantity != null) {
      conditions.push(lte(inventory.quantityAvailable, filters.maxQuantity));
    }
    if (filters.lowStock) {
      // Low stock means available quantity is below default threshold
      // Note: This checks individual items. For aggregated by SKU, use SUM() with GROUP BY
      conditions.push(lt(inventory.quantityAvailable, DEFAULT_LOW_STOCK_THRESHOLD));
    }

    // qualityStatus: derived from status + expiryDate (damaged=status, expired=expiryDate<today, quarantined=status, good=available status + not expired)
    const qualityStatuses = Array.isArray(filters.qualityStatus)
      ? filters.qualityStatus
      : filters.qualityStatus
        ? [filters.qualityStatus]
        : [];
    if (qualityStatuses.length > 0) {
      const qualityConditions = qualityStatuses.map((qs) => {
        if (qs === 'damaged') return eq(inventory.status, 'damaged');
        if (qs === 'quarantined') return eq(inventory.status, 'quarantined');
        if (qs === 'expired') {
          return sql`${inventory.expiryDate} IS NOT NULL AND (${inventory.expiryDate}::date) < CURRENT_DATE`;
        }
        if (qs === 'good') {
          return and(
            inArray(inventory.status, ['available', 'allocated', 'sold', 'returned']),
            or(
              isNull(inventory.expiryDate),
              sql`(${inventory.expiryDate}::date) >= CURRENT_DATE`
            )!
          )!;
        }
        return sql`false`;
      }).filter(Boolean);
      if (qualityConditions.length > 0) {
        conditions.push(or(...qualityConditions)!);
      }
    }

    // ageRange: days since createdAt (inventory age)
    if (filters.ageRange && filters.ageRange !== 'all') {
      const now = new Date();
      if (filters.ageRange === '0-30') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        conditions.push(gte(inventory.createdAt, cutoff));
      } else if (filters.ageRange === '31-60') {
        const from = new Date(now);
        from.setDate(from.getDate() - 60);
        const to = new Date(now);
        to.setDate(to.getDate() - 31);
        conditions.push(and(gte(inventory.createdAt, from), lte(inventory.createdAt, to))!);
      } else if (filters.ageRange === '61-90') {
        const from = new Date(now);
        from.setDate(from.getDate() - 90);
        const to = new Date(now);
        to.setDate(to.getDate() - 61);
        conditions.push(and(gte(inventory.createdAt, from), lte(inventory.createdAt, to))!);
      } else if (filters.ageRange === '90+') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 90);
        conditions.push(lte(inventory.createdAt, cutoff));
      }
    }

    if (filters.minValue != null) {
      conditions.push(gte(inventory.totalValue, filters.minValue));
    }
    if (filters.maxValue != null) {
      conditions.push(lte(inventory.totalValue, filters.maxValue));
    }

    const productJoin = eq(inventory.productId, products.id);

    // Keep count and totals on the same join graph as the row query when search touches products.
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .leftJoin(products, productJoin)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Raw SQL justified: COUNT(DISTINCT CASE WHEN) for lowStockCount.
    // Drizzle count() cannot express conditional distinct count.
    const [totalsResult] = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalItems: sql<number>`COUNT(*)::int`,
        totalSkus: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
        lowStockCount: sql<number>`
          COUNT(DISTINCT CASE WHEN ${inventory.quantityAvailable} < ${DEFAULT_LOW_STOCK_THRESHOLD} THEN ${inventory.productId} END)::int
        `,
      })
      .from(inventory)
      .leftJoin(products, productJoin)
      .where(and(...conditions));

    // Build order clause
    const orderColumn =
      sortBy === 'quantityOnHand'
        ? inventory.quantityOnHand
        : sortBy === 'totalValue'
          ? inventory.totalValue
          : sortBy === 'status'
            ? inventory.status
            : inventory.createdAt;
    const orderDir = sortOrder === 'asc' ? asc : desc;

    // Get inventory items with pagination
    // OPTIMIZED: Products join is now always included (not just for search) to support search filter
    const offset = (page - 1) * limit;
    const itemsWithRelations = await db
      .select({
        item: inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, productJoin)
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    // Map query results to InventoryWithRelations type
    // Note: batchNumber and metadata are required by type; inventory table has no metadata column
    const items = itemsWithRelations.map(({ item, product, location }) => ({
      ...item,
      batchNumber: null, // Not in base schema but required by InventoryWithRelations type
      metadata: null as FlexibleJson | null, // Inventory table has no metadata column
      product: product as InventoryWithRelations["product"],
      location: location as InventoryWithRelations["location"],
    }));

    return {
      items,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      totals: {
        totalValue: Number(totalsResult?.totalValue ?? 0),
        totalItems: totalsResult?.totalItems ?? 0,
        totalSkus: totalsResult?.totalSkus ?? 0,
        lowStockCount: totalsResult?.lowStockCount ?? 0,
      },
    };
  }
);

export const listInventory = createServerFn({ method: 'GET' })
  .inputValidator(inventoryListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return _listInventory(data, ctx.organizationId);
  });

/**
 * Quick search inventory items by product name, SKU, lot number, or serial number.
 * Optimized for autocomplete/typeahead use cases.
 */
export const quickSearchInventory = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      z.object({
        q: z.string().min(2),
        limit: z.number().int().positive().default(10),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    const searchPattern = containsPattern(data.q);

    const results = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        productSku: products.sku,
        locationId: inventory.locationId,
        locationName: locations.name,
        quantityOnHand: inventory.quantityOnHand,
        quantityAvailable: inventory.quantityAvailable,
        status: inventory.status,
        lotNumber: inventory.lotNumber,
        serialNumber: inventory.serialNumber,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(inventory.organizationId, ctx.organizationId),
          or(
            ilike(products.name, searchPattern),
            ilike(products.sku, searchPattern),
            ilike(inventory.lotNumber, searchPattern),
            ilike(inventory.serialNumber, searchPattern)
          )!
        )
      )
      .orderBy(desc(inventory.quantityOnHand))
      .limit(data.limit);

    return { items: results, total: results.length };
  });

/**
 * Get single inventory item with all related data.
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
/**
 * Get single inventory item with all related data.
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getInventoryItem = cache(
  async (
    id: string,
    organizationId: string
  ): Promise<{
    item: InventoryWithRelations;
    movements: InventoryMovementRecord[];
    costLayers: (typeof inventoryCostLayers.$inferSelect)[];
  }> => {
    // Get inventory item (specify fields for better performance)
    const [item] = await db
      .select({
        id: inventory.id,
        organizationId: inventory.organizationId,
        productId: inventory.productId,
        locationId: inventory.locationId,
        status: inventory.status,
        quantityOnHand: inventory.quantityOnHand,
        quantityAllocated: inventory.quantityAllocated,
        quantityAvailable: inventory.quantityAvailable,
        unitCost: inventory.unitCost,
        totalValue: inventory.totalValue,
        lotNumber: inventory.lotNumber,
        serialNumber: inventory.serialNumber,
        expiryDate: inventory.expiryDate,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
        createdBy: inventory.createdBy,
        updatedBy: inventory.updatedBy,
      })
      .from(inventory)
      .where(and(eq(inventory.id, id), eq(inventory.organizationId, organizationId)))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Inventory item not found', 'inventory');
    }

    // Get related data in parallel (with orgId filters on joins)
    const [product, location, movements, costLayers] = await Promise.all([
      // Product (with orgId filter)
      db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.organizationId, organizationId)
          )
        )
        .limit(1)
        .then((r) => r[0] || null),
      // Location (with orgId filter)
      db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, item.locationId),
            eq(locations.organizationId, organizationId)
          )
        )
        .limit(1)
        .then((r) => r[0] || null),
      // Recent movements (with orgId filter)
      db
        .select()
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.inventoryId, id),
            eq(inventoryMovements.organizationId, organizationId)
          )
        )
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(50),
      // Cost layers (with orgId filter)
      db
        .select()
        .from(inventoryCostLayers)
        .where(
          and(
            eq(inventoryCostLayers.inventoryId, id),
            eq(inventoryCostLayers.organizationId, organizationId)
          )
        )
        .orderBy(asc(inventoryCostLayers.receivedAt)),
    ]);

    return {
      item: {
        ...item,
        batchNumber: null, // Not in base schema but required by InventoryWithRelations type
        metadata: null as FlexibleJson | null, // Inventory table has no metadata column
        product: product as unknown as InventoryWithRelations["product"],
        location: location as unknown as InventoryWithRelations["location"],
        // Note: qualityStatus is not in the actual inventory table schema (PRD mentions it but not implemented)
        // Components may derive it from status or other fields
      },
      movements,
      costLayers,
    };
  }
);

export const getInventoryItem = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ id: z.string().uuid() })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return _getInventoryItem(data.id, ctx.organizationId);
  });

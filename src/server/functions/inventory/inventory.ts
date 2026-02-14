/**
 * Inventory Server Functions
 *
 * Comprehensive inventory CRUD, adjustments, transfers, and allocation operations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, isNull, isNotNull, gte, lte, inArray, lt, ilike, or } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  inventory,
  inventoryMovements,
  warehouseLocations as locations,
  products,
  inventoryCostLayers,
  purchaseOrders,
  orders,
  activities,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { containsPattern } from '@/lib/db/utils';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { inventoryLogger } from '@/lib/logger';
import {
  inventoryListQuerySchema,
  movementListQuerySchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  inventoryStatusSchema,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type ListInventoryResult,
  type ListMovementsResult,
  type InventoryWithRelations,
  type CategoryStock,
  type LocationStock,
  type RecentMovement,
} from '@/lib/schemas/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';

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

/** PHASE12-001: Retry config for critical inventory operations. Max 3 attempts, exponential backoff, jitter. */
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 100;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { label?: string }
): Promise<T> {
  const label = options?.label ?? 'operation';
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const baseDelay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay;
        inventoryLogger.warn(`[${label}] Retry attempt ${attempt}/${RETRY_MAX_ATTEMPTS} after error`, { error: e });
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
      }
    }
  }
  inventoryLogger.error(`[${label}] All ${RETRY_MAX_ATTEMPTS} attempts failed`);
  throw lastError;
}

// Type alias for Drizzle transaction parameter
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Safely check if an activity with the given movementId already exists.
 * Uses safe JSON extraction with NULL checks to prevent errors.
 */
async function checkActivityExists(
  tx: DbTransaction,
  organizationId: string,
  movementId: string
): Promise<boolean> {
  // RAW SQL (Phase 11 Keep): JSONB extract, historical CTEs, complex EXISTS. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
  const [existing] = await tx
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, organizationId),
        isNotNull(activities.metadata),
        sql`${activities.metadata}->>'movementId' = ${movementId}`
      )
    )
    .limit(1);
  return !!existing;
}

/**
 * Log activity inside transaction with safe error handling.
 * If logging fails, transaction continues (activity logging is non-critical).
 */
async function logActivityInTransaction(
  tx: DbTransaction,
  ctx: Awaited<ReturnType<typeof withAuth>>,
  params: {
    entityType: 'product' | 'inventory';
    entityId: string;
    action: 'created' | 'updated' | 'deleted';
    description: string;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await tx.insert(activities).values({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      description: params.description,
      metadata: params.metadata as Record<string, unknown>,
      createdBy: ctx.user.id,
    });
  } catch (error) {
    // Log error but don't fail transaction - activity logging is non-critical
    inventoryLogger.error('[logActivityInTransaction] Failed to log activity', error, {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
    });
  }
}

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

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
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
      .leftJoin(products, eq(inventory.productId, products.id))
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
    z.object({
      q: z.string().min(2),
      limit: z.number().int().positive().default(10),
    })
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
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return _getInventoryItem(data.id, ctx.organizationId);
  });

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================

/**
 * Adjust inventory quantity with full audit trail.
 */
export const adjustInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockAdjustmentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });

    return await db.transaction(async (tx) => {
      // Read WITH lock inside transaction to prevent race conditions
      let [inventoryRecord] = await tx
        .select({
          id: inventory.id,
          quantityOnHand: inventory.quantityOnHand,
          unitCost: inventory.unitCost,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId)
          )
        )
        .for('update')
        .limit(1);

      // Use fresh data from locked row
      const previousQuantity = inventoryRecord?.quantityOnHand ?? 0;
      const newQuantity = previousQuantity + data.adjustmentQty;

      // Validate with fresh locked data
      if (newQuantity < 0) {
        // Check if location allows negative inventory
        const [loc] = await tx
          .select({
            attributes: locations.attributes,
          })
          .from(locations)
          .where(
            and(
              eq(locations.id, data.locationId),
              eq(locations.organizationId, ctx.organizationId)
            )
          )
          .limit(1);

        if (!loc?.attributes?.allowNegative) {
          throw new ValidationError('Adjustment would result in negative inventory', {
            adjustmentQty: ['Would result in negative inventory'],
          });
        }
      }
      if (!inventoryRecord) {
        // Create new inventory record
        [inventoryRecord] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: 'available',
            quantityOnHand: newQuantity,
            quantityAllocated: 0,
            unitCost: 0,
            totalValue: 0,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        // Update existing record
        [inventoryRecord] = await tx
          .update(inventory)
          .set({
            quantityOnHand: newQuantity,
            totalValue: sql`${newQuantity} * COALESCE(${inventory.unitCost}, 0)`,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, inventoryRecord.id))
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
          movementType: 'adjust',
          quantity: data.adjustmentQty,
          previousQuantity,
          newQuantity,
          unitCost: inventoryRecord.unitCost,
          totalCost: sql`${data.adjustmentQty} * COALESCE(${inventoryRecord.unitCost}, 0)`,
          referenceType: 'adjustment',
          metadata: {
            reason: data.reason,
          },
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity for adjustment (significant movement) - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'product',
          entityId: data.productId,
          action: 'updated',
          description: `Inventory adjusted (movement: adjust)`,
          metadata: {
            movementId: movement.id,
            movementType: 'adjust',
            referenceType: 'adjustment',
            productId: data.productId,
            quantity: data.adjustmentQty,
            reason: data.reason,
          },
        });
      }

      return {
        item: inventoryRecord,
        movement,
      };
    });
  });

/**
 * Transfer inventory between locations.
 */
export const transferInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockTransferSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });

    if (data.fromLocationId === data.toLocationId) {
      throw new ValidationError('Cannot transfer to the same location', {
        toLocationId: ['Cannot be the same as source location'],
      });
    }

    return await db.transaction(async (tx) => {
      // Read source WITH lock inside transaction to prevent race conditions
      const [sourceInventory] = await tx
        .select()
        .from(inventory)
        .where(
          and(
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

      // Validate with fresh locked data
      if ((sourceInventory.quantityAvailable ?? 0) < data.quantity) {
        throw new ValidationError('Insufficient available quantity for transfer', {
          quantity: [`Only ${sourceInventory.quantityAvailable} available`],
        });
      }

      // Use fresh data from locked row
      const newSourceQty = (sourceInventory.quantityOnHand ?? 0) - data.quantity;
      await tx
        .update(inventory)
        .set({
          quantityOnHand: newSourceQty,
          totalValue: sql`${newSourceQty} * COALESCE(${inventory.unitCost}, 0)`,
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
            totalValue: sql`${destNewQty} * COALESCE(${sourceInventory.unitCost}, 0)`,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        [destInventory] = await tx
          .update(inventory)
          .set({
            quantityOnHand: destNewQty,
            totalValue: sql`${destNewQty} * COALESCE(${inventory.unitCost}, 0)`,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, destInventory.id))
          .returning();
      }

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

      return {
        sourceItem: { ...sourceInventory, quantityOnHand: newSourceQty },
        destinationItem: destInventory,
        movement,
      };
    });
  });

// ============================================================================
// ALLOCATION
// ============================================================================

const allocateInventorySchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceId: z.string().uuid(),
  referenceType: z.string(),
  reservedUntil: z.coerce.date().optional(),
});

/**
 * Allocate inventory for an order or reservation.
 *
 * PHASE12-001: Uses retry with exponential backoff for transient DB failures (e.g. deadlock).
 */
export const allocateInventory = createServerFn({ method: 'POST' })
  .inputValidator(allocateInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.allocate });

    return await retryWithBackoff(
      () =>
        db.transaction(async (tx) => {
      // Read WITH lock inside transaction to prevent race conditions
      const [item] = await tx
        .select()
        .from(inventory)
        .where(
          and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
        )
        .for('update')
        .limit(1);

      if (!item) {
        throw new NotFoundError('Inventory item not found', 'inventory');
      }

      // Validate with fresh locked data
      if ((item.quantityAvailable ?? 0) < data.quantity) {
        throw new ValidationError('Insufficient available quantity', {
          quantity: [`Only ${item.quantityAvailable} available for allocation`],
        });
      }

      // Use fresh data from locked row
      const newAllocated = (item.quantityAllocated ?? 0) + data.quantity;
      const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

      // Update inventory
      const [updatedItem] = await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          status: newAvailable <= 0 ? 'allocated' : 'available',
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(inventory.id, data.inventoryId))
        .returning();

      // Create movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: data.inventoryId,
          productId: item.productId,
          locationId: item.locationId,
          movementType: 'allocate',
          quantity: -data.quantity, // Negative for allocation
          previousQuantity: item.quantityAvailable ?? 0,
          newQuantity: newAvailable,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          metadata: {
            reservedUntil: data.reservedUntil?.toISOString(),
          },
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity for allocation - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'inventory',
          entityId: data.inventoryId,
          action: 'updated',
          description: `Inventory allocated (${data.quantity} units)`,
          metadata: {
            movementId: movement.id,
            movementType: 'allocate',
            productId: item.productId,
            quantity: data.quantity,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
          },
        });
      }

      return {
        item: updatedItem,
        movement,
      };
        }),
      { label: 'allocateInventory' }
    );
  });

/**
 * Deallocate inventory (release reservation).
 */
export const deallocateInventory = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      inventoryId: z.string().uuid(),
      quantity: z.number().int().positive(),
      referenceId: z.string().uuid().optional(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.allocate });

    return await db.transaction(async (tx) => {
      // Read WITH lock inside transaction to prevent race conditions
      const [item] = await tx
        .select()
        .from(inventory)
        .where(
          and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
        )
        .for('update')
        .limit(1);

      if (!item) {
        throw new NotFoundError('Inventory item not found', 'inventory');
      }

      // Validate with fresh locked data
      if ((item.quantityAllocated ?? 0) < data.quantity) {
        throw new ValidationError('Cannot deallocate more than allocated', {
          quantity: [`Only ${item.quantityAllocated} currently allocated`],
        });
      }

      // Use fresh data from locked row
      const newAllocated = (item.quantityAllocated ?? 0) - data.quantity;
      const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

      // Update inventory
      const [updatedItem] = await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          status: newAllocated > 0 ? 'allocated' : 'available',
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(inventory.id, data.inventoryId))
        .returning();

      // Create movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: data.inventoryId,
          productId: item.productId,
          locationId: item.locationId,
          movementType: 'deallocate',
          quantity: data.quantity, // Positive for deallocation
          previousQuantity: item.quantityAvailable ?? 0,
          newQuantity: newAvailable,
          referenceId: data.referenceId,
          metadata: {
            reason: data.reason,
          },
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity for deallocation - inside transaction for atomicity
      const activityExists = await checkActivityExists(tx, ctx.organizationId, movement.id);
      if (!activityExists) {
        await logActivityInTransaction(tx, ctx, {
          entityType: 'inventory',
          entityId: data.inventoryId,
          action: 'updated',
          description: `Inventory deallocated (${data.quantity} units)`,
          metadata: {
            movementId: movement.id,
            movementType: 'deallocate',
            productId: item.productId,
            quantity: data.quantity,
            referenceId: data.referenceId,
            reason: data.reason,
          },
        });
      }

      return {
        item: updatedItem,
        movement,
      };
    });
  });

// ============================================================================
// RECEIVING
// ============================================================================

const receiveInventorySchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Receive inventory with cost layer creation.
 */
export const receiveInventory = createServerFn({ method: 'POST' })
  .inputValidator(receiveInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    // Validate product exists (only need id for existence check)
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.organizationId, ctx.organizationId)))
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    return await db.transaction(async (tx) => {
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
            data.lotNumber ? eq(inventory.lotNumber, data.lotNumber) : isNull(inventory.lotNumber)
          )
        )
        .for('update')
        .limit(1);

      const prevQuantity = inventoryRecord?.quantityOnHand ?? 0;
      const newQuantity = prevQuantity + data.quantity;

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
            totalValue: newTotalCost,
            lotNumber: data.lotNumber,
            serialNumber: data.serialNumber,
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
            totalValue: newTotalCost,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(inventory.id, inventoryRecord.id))
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
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      // Create cost layer for FIFO
      const [costLayer] = await tx
        .insert(inventoryCostLayers)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inventoryRecord.id,
          receivedAt: new Date(),
          quantityReceived: data.quantity,
          quantityRemaining: data.quantity,
          unitCost: String(data.unitCost),
          referenceType: data.referenceType as
            | 'purchase_order'
            | 'adjustment'
            | 'transfer'
            | undefined,
          referenceId: data.referenceId,
          expiryDate: data.expiryDate,
        })
        .returning();

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
            referenceType: data.referenceType,
            referenceId: data.referenceId,
          },
        });
      }

      return {
        item: inventoryRecord,
        movement,
        costLayer,
      };
    });
  });

// ============================================================================
// MOVEMENTS
// ============================================================================

/**
 * List inventory movements with filtering.
 */
export const listMovements = createServerFn({ method: 'GET' })
  .inputValidator(movementListQuerySchema)
  .handler(async ({ data }): Promise<ListMovementsResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    const { page = 1, pageSize = 50, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(inventoryMovements.organizationId, ctx.organizationId)];

    if (filters.inventoryId) {
      conditions.push(eq(inventoryMovements.inventoryId, filters.inventoryId));
    }
    if (filters.productId) {
      conditions.push(eq(inventoryMovements.productId, filters.productId));
    }
    if (filters.locationId) {
      conditions.push(eq(inventoryMovements.locationId, filters.locationId));
    }
    if (filters.movementType) {
      conditions.push(eq(inventoryMovements.movementType, filters.movementType));
    }
    if (filters.referenceType) {
      conditions.push(eq(inventoryMovements.referenceType, filters.referenceType));
    }
    if (filters.referenceId) {
      conditions.push(eq(inventoryMovements.referenceId, filters.referenceId));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryMovements)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get summary
    const [summary] = await db
      .select({
        totalInbound: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryMovements.quantity} > 0 THEN ${inventoryMovements.quantity} ELSE 0 END), 0)::int`,
        totalOutbound: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryMovements.quantity} < 0 THEN ABS(${inventoryMovements.quantity}) ELSE 0 END), 0)::int`,
        netChange: sql<number>`COALESCE(SUM(${inventoryMovements.quantity}), 0)::int`,
      })
      .from(inventoryMovements)
      .where(and(...conditions));

    // Get movements with pagination
    // Join with orders and purchase_orders to get reference numbers
    const offset = (page - 1) * limit;

    // Build order clause based on sortBy and sortOrder
    const orderColumn =
      sortBy === 'quantity'
        ? inventoryMovements.quantity
        : sortBy === 'movementType'
          ? inventoryMovements.movementType
          : sortBy === 'unitCost'
            ? inventoryMovements.unitCost
            : sortBy === 'totalCost'
              ? inventoryMovements.totalCost
              : inventoryMovements.createdAt; // Default to createdAt
    const orderDir = sortOrder === 'asc' ? asc : desc;

    const movementRows = await db
      .select({
        movement: inventoryMovements,
        product: products,
        location: locations,
        order: orders,
        purchaseOrder: purchaseOrders,
      })
      .from(inventoryMovements)
      .leftJoin(products, eq(inventoryMovements.productId, products.id))
      .leftJoin(locations, eq(inventoryMovements.locationId, locations.id))
      .leftJoin(
        orders,
        and(
          eq(inventoryMovements.referenceType, 'order'),
          eq(inventoryMovements.referenceId, orders.id)
        )
      )
      .leftJoin(
        purchaseOrders,
        and(
          eq(inventoryMovements.referenceType, 'purchase_order'),
          eq(inventoryMovements.referenceId, purchaseOrders.id)
        )
      )
      .where(and(...conditions))
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    const movements = movementRows.map(({ movement, product, location, order, purchaseOrder }) => ({
      ...movement,
      metadata: movement.metadata as FlexibleJson | null,
      productName: product?.name ?? null,
      productSku: product?.sku ?? null,
      locationName: location?.name ?? null,
      locationCode: location?.locationCode ?? null,
      // Reference document numbers for display
      referenceNumber: order?.orderNumber ?? purchaseOrder?.poNumber ?? null,
    }));

    return {
      movements: movements as typeof movements,
      total,
      page,
      limit,
      hasMore: offset + movements.length < total,
      summary: {
        totalInbound: summary?.totalInbound ?? 0,
        totalOutbound: summary?.totalOutbound ?? 0,
        netChange: summary?.netChange ?? 0,
      },
    };
  });

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Get inventory dashboard metrics.
 */
export const getInventoryDashboard = createServerFn({ method: 'POST' }).handler(async () => {
  const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

  // Get inventory metrics
  const [metrics] = await db
    .select({
      totalItems: sql<number>`COUNT(*)::int`,
      totalSkus: sql<number>`
        (
          SELECT COUNT(*)::int
          FROM products p
          WHERE p.organization_id = ${ctx.organizationId}
            AND p.deleted_at IS NULL
        )
      `,
      totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::numeric`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      locationsCount: sql<number>`COUNT(DISTINCT ${inventory.locationId})::int`,
        lowStockCount: sql<number>`
          COUNT(DISTINCT CASE WHEN ${inventory.quantityAvailable} < ${DEFAULT_LOW_STOCK_THRESHOLD} THEN ${inventory.productId} END)::int
        `,
      outOfStockCount: sql<number>`
        COUNT(DISTINCT CASE WHEN ${inventory.quantityAvailable} <= 0 THEN ${inventory.productId} END)::int
      `,
      allocatedCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.quantityAllocated} > 0)::int`,
    })
    .from(inventory)
    .where(eq(inventory.organizationId, ctx.organizationId));

  // Get recent movements (last 30 days only to prevent full table scan)
  // Specify fields for better performance
  const recentMovements = await db
    .select({
      id: inventoryMovements.id,
      organizationId: inventoryMovements.organizationId,
      inventoryId: inventoryMovements.inventoryId,
      productId: inventoryMovements.productId,
      locationId: inventoryMovements.locationId,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      previousQuantity: inventoryMovements.previousQuantity,
      newQuantity: inventoryMovements.newQuantity,
      unitCost: inventoryMovements.unitCost,
      totalCost: inventoryMovements.totalCost,
      referenceType: inventoryMovements.referenceType,
      referenceId: inventoryMovements.referenceId,
      metadata: inventoryMovements.metadata,
      notes: inventoryMovements.notes,
      createdAt: inventoryMovements.createdAt,
      createdBy: inventoryMovements.createdBy,
    })
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.organizationId, ctx.organizationId),
        gte(inventoryMovements.createdAt, sql`NOW() - INTERVAL '30 days'`)
      )
    )
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(10);

  // Get top moving products (by movement count)
  const topMoving = await db
    .select({
      productId: inventoryMovements.productId,
      productName: products.name,
      productSku: products.sku,
      movementCount: sql<number>`COUNT(*)::int`,
      totalQuantity: sql<number>`SUM(ABS(${inventoryMovements.quantity}))::int`,
    })
    .from(inventoryMovements)
    .leftJoin(products, eq(inventoryMovements.productId, products.id))
    .where(
      and(
        eq(inventoryMovements.organizationId, ctx.organizationId),
        gte(inventoryMovements.createdAt, sql`NOW() - INTERVAL '30 days'`)
      )
    )
    .groupBy(inventoryMovements.productId, products.name, products.sku)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  // Calculate turnover rate (COGS / Average Inventory Value over 30 days)
  // Simplified: total outbound quantity / average on-hand quantity
  const [turnoverData] = await db
    .select({
      totalOutbound: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryMovements.quantity} < 0 THEN ABS(${inventoryMovements.quantity}) ELSE 0 END), 0)::numeric`,
    })
    .from(inventoryMovements)
    .where(
      and(
        eq(inventoryMovements.organizationId, ctx.organizationId),
        gte(inventoryMovements.createdAt, sql`NOW() - INTERVAL '30 days'`)
      )
    );

  // Turnover = (total outbound / average inventory) - simplified to outbound / current inventory
  const avgInventory = Number(metrics?.totalUnits ?? 0) || 1;
  const turnoverRate = avgInventory > 0 ? Number(turnoverData?.totalOutbound ?? 0) / avgInventory : 0;

  // Count pending purchase orders (status: ordered or partial_received)
  const [pendingPOs] = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.organizationId, ctx.organizationId),
        inArray(purchaseOrders.status, ['ordered', 'partial_received']),
        isNull(purchaseOrders.deletedAt)
      )
    );

  return {
    metrics: {
      totalItems: metrics?.totalItems ?? 0,
      totalSkus: metrics?.totalSkus ?? 0,
      totalUnits: Number(metrics?.totalUnits ?? 0),
      totalValue: Number(metrics?.totalValue ?? 0),
      locationsCount: metrics?.locationsCount ?? 0,
      lowStockCount: metrics?.lowStockCount ?? 0,
      outOfStockCount: metrics?.outOfStockCount ?? 0,
      allocatedCount: metrics?.allocatedCount ?? 0,
      turnoverRate: Math.round(turnoverRate * 10) / 10, // Round to 1 decimal
      pendingReceipts: pendingPOs?.count ?? 0,
    },
    recentMovements,
    topMoving,
  };
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

const bulkUpdateStatusSchema = z.object({
  inventoryIds: z.array(z.string().uuid()).min(1).max(100),
  status: inventoryStatusSchema,
  reason: z.string().min(1),
});

// ============================================================================
// WMS DASHBOARD QUERIES
// ============================================================================

// Types imported from schema - CategoryStock, LocationStock, RecentMovement

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
  .inputValidator(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
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
    inventoryLogger.debug('[getWMSDashboard] auth ok', { userId: ctx.user.id, organizationId: ctx.organizationId });

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
        lowStockCount: sql<number>`
          COUNT(DISTINCT CASE WHEN ${inventory.quantityAvailable} < ${DEFAULT_LOW_STOCK_THRESHOLD} AND ${inventory.quantityAvailable} > 0 THEN ${inventory.productId} END)::int
        `,
        outOfStockCount: sql<number>`
          COUNT(DISTINCT CASE WHEN ${inventory.quantityAvailable} <= 0 THEN ${inventory.productId} END)::int
        `,
      })
      .from(inventory)
      .where(eq(inventory.organizationId, ctx.organizationId)),

    // Previous period alerts count (reconstructed from movements using CTE)
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

/**
 * Bulk update inventory status.
 */
export const bulkUpdateStatus = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });

    return await db.transaction(async (tx) => {
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

// ============================================================================
// SERIAL NUMBER MANAGEMENT
// ============================================================================

export interface GetAvailableSerialsResult {
  productId: string;
  availableSerials: {
    id: string;
    serialNumber: string;
    locationId: string | null;
    locationName: string | null;
    receivedAt?: string;
  }[];
  totalAvailable: number;
}

/**
 * Get available serial numbers for a product.
 *
 * Returns serial numbers from inventory that:
 * - Are not already allocated to another order
 * - Are in 'available' status
 * - Optionally filtered by location
 *
 * Used by the picking workflow to populate serial number selectors.
 */
export const getAvailableSerials = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    // Build conditions
    const conditions = [
      eq(inventory.organizationId, ctx.organizationId),
      eq(inventory.productId, data.productId),
      sql`${inventory.serialNumber} IS NOT NULL`,
      sql`${inventory.serialNumber} != ''`,
      // Only available inventory (not allocated, not reserved)
      eq(inventory.status, 'available'),
      // Must have positive quantity
      sql`${inventory.quantityOnHand} > 0`,
    ];

    if (data.locationId) {
      conditions.push(eq(inventory.locationId, data.locationId));
    }

    // OPTIMIZED: Use SQL NOT EXISTS instead of fetching all allocated serials and filtering in memory
    // This eliminates the need to load all allocated serials into memory
    const { orderLineItems } = await import('drizzle/schema');

    const results = await db
      .select({
        id: inventory.id,
        serialNumber: inventory.serialNumber,
        locationId: inventory.locationId,
        locationName: locations.name,
        quantityOnHand: inventory.quantityOnHand,
        quantityAvailable: inventory.quantityAvailable,
        createdAt: inventory.createdAt,
      })
      .from(inventory)
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          ...conditions,
          // Filter out serials already allocated using SQL NOT EXISTS
          sql`NOT EXISTS (
            SELECT 1
            FROM ${orderLineItems}
            WHERE ${orderLineItems.organizationId} = ${ctx.organizationId}
              AND ${orderLineItems.productId} = ${data.productId}
              AND ${orderLineItems.allocatedSerialNumbers} IS NOT NULL
              AND ${orderLineItems.allocatedSerialNumbers} @> to_jsonb(${inventory.serialNumber}::text)
          )`
        )
      )
      .orderBy(asc(inventory.createdAt), asc(inventory.serialNumber))
      .limit(500); // Add pagination limit to prevent large result sets

    // Map to result format (FIFO order; receivedAt = createdAt as proxy for age display)
    // Trim serial numbers to handle DB whitespace; reject empty after trim
    const availableSerials = results
      .filter((item) => item.serialNumber?.trim()) // Filter out null/empty serials
      .map((item) => ({
        id: item.id,
        serialNumber: item.serialNumber!.trim(),
        locationId: item.locationId,
        locationName: item.locationName,
        receivedAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      }));

    const result: GetAvailableSerialsResult = {
      productId: data.productId,
      availableSerials,
      totalAvailable: availableSerials.length,
    };
    return result;
  });

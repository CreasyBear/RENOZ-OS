/**
 * Product Inventory Server Functions
 *
 * Inventory tracking, stock movements, allocations, and location management.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, isNull, lt, gte, or, inArray, ne, ilike, sum } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  products,
  inventory,
  inventoryMovements,
  warehouseLocations as locations,
} from 'drizzle/schema';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  createLocationSchema,
  updateLocationSchema,
  createMovementSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  inventoryStatusValues,
  movementTypeValues,
  isValidMovementType,
} from '@/lib/schemas/inventory';
import {
  adjustInventory,
  receiveInventory,
  transferInventory,
} from '@/server/functions/inventory/inventory';

// ============================================================================
// TYPES
// ============================================================================

type Location = typeof locations.$inferSelect;
type LocationInsert = typeof locations.$inferInsert;
type Inventory = typeof inventory.$inferSelect;
type InventoryMovement = typeof inventoryMovements.$inferSelect;
type Product = typeof products.$inferSelect;

interface InventoryWithProduct extends Inventory {
  product: Pick<Product, 'id' | 'sku' | 'name' | 'type' | 'status'>;
}

export interface ProductInventorySummary {
  productId: string;
  sku: string;
  name: string;
  totalOnHand: number;
  totalAllocated: number;
  totalAvailable: number;
  totalValue: number;
  locationCount: number;
  locations: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    quantityOnHand: number;
    quantityAllocated: number;
    quantityAvailable: number;
  }>;
}

interface MovementWithDetails extends InventoryMovement {
  product: Pick<Product, 'id' | 'sku' | 'name'>;
  location: Pick<Location, 'id' | 'locationCode' | 'name'>;
}

interface LowStockAlert {
  productId: string;
  sku: string;
  name: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityAvailable: number;
  reorderPoint: number;
  status: 'critical' | 'warning';
}

// ============================================================================
// LOCATION CRUD
// ============================================================================

/**
 * List all locations for the organization.
 */
export const listLocations = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      isActive: z.boolean().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(locations.organizationId, ctx.organizationId)];

    if (data.isActive !== undefined) {
      conditions.push(eq(locations.isActive, data.isActive));
    }

    const offset = (data.page - 1) * data.limit;

    const [results, countResult] = await Promise.all([
      db
        .select()
        .from(locations)
        .where(and(...conditions))
        .orderBy(asc(locations.name))
        .limit(data.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(locations)
        .where(and(...conditions)),
    ]);

    return {
      locations: results,
      total: countResult[0]?.count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

/**
 * Get a single location by ID.
 */
export const getLocation = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!location) {
      throw new NotFoundError('Location not found', 'location');
    }

    return location;
  });

/**
 * Create a new location.
 */
export const createLocation = createServerFn({ method: 'POST' })
  .inputValidator(createLocationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check for duplicate code
    const [existing] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(eq(locations.organizationId, ctx.organizationId), eq(locations.locationCode, data.code))
      )
      .limit(1);

    if (existing) {
      throw new ValidationError('Location code already exists', {
        code: ['Location code already exists'],
      });
    }

    // RAW SQL (Phase 11 Keep): jsonb_set, bulk CASE. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    if (data.isDefault) {
      await db
        .update(locations)
        .set({
          attributes: sql`jsonb_set(coalesce(${locations.attributes}, '{}'::jsonb), '{isDefault}', 'false'::jsonb, true)`,
        })
        .where(eq(locations.organizationId, ctx.organizationId));
    }

    const [location] = await db
      .insert(locations)
      .values({
        organizationId: ctx.organizationId,
        locationCode: data.code,
        name: data.name,
        locationType: 'bin',
        isPickable: true,
        isReceivable: true,
        isActive: data.isActive ?? true,
        attributes: {
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          isDefault: data.isDefault ?? false,
          allowNegative: data.allowNegative ?? false,
        },
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return location as Location;
  });

/**
 * Update a location.
 */
export const updateLocation = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateLocationSchema,
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify location exists
    const [existing] = await db
      .select({
        id: locations.id,
        locationCode: locations.locationCode,
        attributes: locations.attributes,
      })
      .from(locations)
      .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Location not found', 'location');
    }

    // Check for duplicate code if changing
    if (data.data.code) {
      const [duplicate] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            eq(locations.locationCode, data.data.code),
            ne(locations.id, data.id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ValidationError('Location code already exists', {
          code: ['Location code already exists'],
        });
      }
    }

    // If setting as default, unset other defaults
    if (data.data.isDefault) {
      await db
        .update(locations)
        .set({
          attributes: sql`jsonb_set(coalesce(${locations.attributes}, '{}'::jsonb), '{isDefault}', 'false'::jsonb, true)`,
        })
        .where(
          and(eq(locations.organizationId, ctx.organizationId), ne(locations.id, data.id))
        );
    }

    const nextAttributes = {
      ...(existing.attributes ?? {}),
      ...(data.data.description !== undefined ? { description: data.data.description } : {}),
      ...(data.data.address !== undefined ? { address: data.data.address } : {}),
      ...(data.data.isDefault !== undefined ? { isDefault: data.data.isDefault } : {}),
      ...(data.data.allowNegative !== undefined ? { allowNegative: data.data.allowNegative } : {}),
    };

    const updateValues: Partial<LocationInsert> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (data.data.code) {
      updateValues.locationCode = data.data.code;
    }

    if (data.data.name !== undefined) {
      updateValues.name = data.data.name;
    }

    if (data.data.isActive !== undefined) {
      updateValues.isActive = data.data.isActive;
    }

    if (
      data.data.description !== undefined ||
      data.data.address !== undefined ||
      data.data.isDefault !== undefined ||
      data.data.allowNegative !== undefined
    ) {
      updateValues.attributes = nextAttributes;
    }

    const [location] = await db
      .update(locations)
      .set(updateValues)
      .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)))
      .returning();

    return location as Location;
  });

/**
 * Delete a location (soft deactivate if has inventory).
 */
export const deleteLocation = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check for existing inventory
    const [hasInventory] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(
        and(eq(inventory.locationId, data.id), eq(inventory.organizationId, ctx.organizationId))
      );

    if ((hasInventory?.count ?? 0) > 0) {
      // Soft delete - just deactivate
      await db
        .update(locations)
        .set({
          isActive: false,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)));

      return { deleted: false, deactivated: true };
    }

    // Hard delete if no inventory
    await db
      .delete(locations)
      .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)));

    return { deleted: true, deactivated: false };
  });

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

/**
 * Get inventory for a product across all locations.
 */
export const getProductInventory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductInventorySummary> => {
    const ctx = await withAuth();

    // Get product info
    const [product] = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
      })
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

    // Transaction ensures set_config and query run on same connection (RLS requires app.organization_id)
    const inventoryByLocation = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      return tx
        .select({
          locationId: inventory.locationId,
          quantityOnHand: sum(inventory.quantityOnHand),
          quantityAllocated: sum(inventory.quantityAllocated),
          totalValue: sum(inventory.totalValue),
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .groupBy(inventory.locationId)
        .orderBy(asc(inventory.locationId));
    });

    const summary: ProductInventorySummary = {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      totalOnHand: 0,
      totalAllocated: 0,
      totalAvailable: 0,
      totalValue: 0,
      locationCount: inventoryByLocation.length,
      locations: inventoryByLocation.map((inv) => {
        const onHand = Number(inv.quantityOnHand ?? 0);
        const allocated = Number(inv.quantityAllocated ?? 0);
        const available = onHand - allocated;

        return {
          locationId: inv.locationId,
          locationCode: '',
          locationName: 'Location',
          quantityOnHand: onHand,
          quantityAllocated: allocated,
          quantityAvailable: available,
        };
      }),
    };

    // Calculate totals from aggregated rows
    for (const loc of inventoryByLocation) {
      const onHand = Number(loc.quantityOnHand ?? 0);
      const allocated = Number(loc.quantityAllocated ?? 0);
      summary.totalOnHand += onHand;
      summary.totalAllocated += allocated;
      summary.totalAvailable += onHand - allocated;
      summary.totalValue += Number(loc.totalValue ?? 0);
    }

    return summary;
  });

/**
 * Get inventory for a location.
 */
export const getLocationInventory = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      locationId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
      status: z.enum(inventoryStatusValues).optional(),
      search: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(inventory.locationId, data.locationId),
      eq(inventory.organizationId, ctx.organizationId),
    ];

    if (data.status) {
      conditions.push(eq(inventory.status, data.status));
    }

    const offset = (data.page - 1) * data.limit;

    // Build search condition if provided
    let searchCondition = undefined;
    if (data.search) {
      const searchPattern = containsPattern(data.search);
      searchCondition = or(
        ilike(products.sku, searchPattern),
        ilike(products.name, searchPattern)
      );
    }

    const baseQuery = db
      .select({
        inventory: inventory,
        product: {
          id: products.id,
          sku: products.sku,
          name: products.name,
          type: products.type,
          status: products.status,
        },
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(searchCondition ? and(...conditions, searchCondition) : and(...conditions));

    const [results, countResult] = await Promise.all([
      baseQuery.orderBy(asc(products.name)).limit(data.limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(searchCondition ? and(...conditions, searchCondition) : and(...conditions)),
    ]);

    return {
      items: results.map((r) => ({
        ...r.inventory,
        product: r.product,
      })) as InventoryWithProduct[],
      total: countResult[0]?.count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

/**
 * Record a stock movement.
 * This is the core function that all other movement types call.
 */
export const recordMovement = createServerFn({ method: 'POST' })
  .inputValidator(createMovementSchema)
  .handler(async ({ data }) => {
    if (data.movementType === 'receive') {
      return receiveInventory({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          unitCost: data.unitCost ?? 0,
          locationId: data.locationId,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
          notes: data.notes,
        },
      });
    }

    if (data.movementType === 'adjust') {
      return adjustInventory({
        data: {
          productId: data.productId,
          locationId: data.locationId,
          adjustmentQty: data.quantity,
          reason:
            typeof data.metadata?.reason === 'string' && data.metadata.reason.trim().length > 0
              ? data.metadata.reason
              : 'system_correction',
          notes: data.notes,
        },
      });
    }

    if (data.movementType === 'transfer') {
      const toLocationId =
        typeof data.metadata?.toLocationId === 'string' ? data.metadata.toLocationId : null;
      if (!toLocationId) {
        throw new ValidationError('Transfer movement requires metadata.toLocationId', {
          toLocationId: ['Provide destination location when recording transfer movements'],
        });
      }
      return transferInventory({
        data: {
          productId: data.productId,
          fromLocationId: data.locationId,
          toLocationId,
          quantity: Math.abs(data.quantity),
          notes: data.notes,
        },
      });
    }

    throw new ValidationError(
      `Movement type "${data.movementType}" must use its domain workflow endpoint`,
      {
        movementType: [
          'Use canonical inventory/order/rma mutation endpoints for this movement type',
        ],
      }
    );
  });

/**
 * Receive stock into a location.
 */
export const receiveStock = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive('Quantity must be positive'),
      unitCost: z.number().min(0).optional(),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    return receiveInventory({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        quantity: data.quantity,
        unitCost: data.unitCost ?? 0,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        notes: data.notes,
      },
    });
  });

/**
 * Allocate stock for an order.
 */
export const allocateStock = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive('Quantity must be positive'),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get inventory record
      const [inv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!inv) {
        throw new NotFoundError(
          'No inventory found for this product at this location',
          'inventory'
        );
      }

      // Drizzle's numericCasted automatically converts to number, no Number() needed
      const available = inv.quantityAvailable ?? 0;
      if (data.quantity > available) {
        throw new ValidationError(
          `Insufficient available stock. Available: ${available}, Requested: ${data.quantity}`,
          {
            quantity: [
              `Insufficient available stock. Available: ${available}, Requested: ${data.quantity}`,
            ],
          }
        );
      }

      // Drizzle's numericCasted automatically converts to number, no Number() needed
      const previousAllocated = inv.quantityAllocated ?? 0;
      const newAllocated = previousAllocated + data.quantity;
      const newAvailable = available - data.quantity;

      // Update inventory
      await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id));

      // Record the movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: data.productId,
          locationId: data.locationId,
          movementType: 'allocate',
          quantity: -data.quantity, // Negative because available is reduced
          previousQuantity: available,
          newQuantity: newAvailable,
          // Drizzle's numericCasted automatically converts to number, no Number() needed
          unitCost: inv.unitCost ?? 0,
          totalCost: (inv.unitCost ?? 0) * data.quantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      return {
        inventory: {
          ...inv,
          quantityAllocated: newAllocated,
          quantityAvailable: newAvailable,
        } as Inventory,
        movement: movement as InventoryMovement,
      };
    });
  });

/**
 * Deallocate (release) previously allocated stock.
 */
export const deallocateStock = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive('Quantity must be positive'),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      // Get inventory record
      const [inv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!inv) {
        throw new NotFoundError('No inventory found', 'inventory');
      }

      // Drizzle's numericCasted automatically converts to number, no Number() needed
      const allocated = inv.quantityAllocated ?? 0;
      if (data.quantity > allocated) {
        throw new ValidationError(
          `Cannot deallocate more than allocated. Allocated: ${allocated}, Requested: ${data.quantity}`,
          {
            quantity: [
              `Cannot deallocate more than allocated. Allocated: ${allocated}, Requested: ${data.quantity}`,
            ],
          }
        );
      }

      // Drizzle's numericCasted automatically converts to number, no Number() needed
      const previousAvailable = inv.quantityAvailable ?? 0;
      const newAllocated = allocated - data.quantity;
      const newAvailable = previousAvailable + data.quantity;

      // Update inventory
      await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id));

      // Record the movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: data.productId,
          locationId: data.locationId,
          movementType: 'deallocate',
          quantity: data.quantity, // Positive because available is increased
          previousQuantity: previousAvailable,
          newQuantity: newAvailable,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      return {
        inventory: {
          ...inv,
          quantityAllocated: newAllocated,
          quantityAvailable: newAvailable,
        } as Inventory,
        movement: movement as InventoryMovement,
      };
    });
  });

/**
 * Adjust stock (correction).
 */
export const adjustStock = createServerFn({ method: 'POST' })
  .inputValidator(stockAdjustmentSchema)
  .handler(async ({ data }) => {
    return adjustInventory({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        adjustmentQty: data.adjustmentQty,
        reason: data.reason,
        notes: data.notes,
      },
    });
  });

/**
 * Transfer stock between locations.
 */
export const transferStock = createServerFn({ method: 'POST' })
  .inputValidator(stockTransferSchema)
  .handler(async ({ data }) => {
    return transferInventory({
      data: {
        inventoryId: data.inventoryId,
        productId: data.productId,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        quantity: data.quantity,
        serialNumbers: data.serialNumbers,
        reason: data.reason,
        notes: data.notes,
      },
    });
  });

// ============================================================================
// MOVEMENT HISTORY
// ============================================================================

/**
 * Get movement history for a product.
 */
export const getProductMovements = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      movementType: z.enum(movementTypeValues).optional(),
      locationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(inventoryMovements.productId, data.productId),
      eq(inventoryMovements.organizationId, ctx.organizationId),
    ];

    if (data.movementType) {
      conditions.push(eq(inventoryMovements.movementType, data.movementType));
    }

    if (data.locationId) {
      conditions.push(eq(inventoryMovements.locationId, data.locationId));
    }

    const offset = (data.page - 1) * data.limit;

    const [results, countResult] = await Promise.all([
      db
        .select({
          movement: inventoryMovements,
          product: {
            id: products.id,
            sku: products.sku,
            name: products.name,
          },
          location: {
            id: locations.id,
            locationCode: locations.locationCode,
            name: locations.name,
          },
        })
        .from(inventoryMovements)
        .innerJoin(products, eq(inventoryMovements.productId, products.id))
        .innerJoin(locations, eq(inventoryMovements.locationId, locations.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(data.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryMovements)
        .where(and(...conditions)),
    ]);

    return {
      movements: results.map((r) => ({
        ...r.movement,
        product: r.product,
        location: r.location,
      })) as MovementWithDetails[],
      total: countResult[0]?.count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

/**
 * Get aggregated movement history for a product.
 * Groups movements by type + reference + date so that e.g. 200 individual
 * "allocate" rows for a single order collapse into one summary row.
 */
export const getAggregatedProductMovements = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      movementType: z.enum(movementTypeValues).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const offset = (data.page - 1) * data.limit;

    // Raw SQL justified: CTE with window function (SUM OVER ROWS BETWEEN) and GROUP BY DATE()
    // Drizzle ORM doesn't provide abstractions for running balance window functions.
    const movementTypeFilter = data.movementType
      ? sql`AND ${inventoryMovements.movementType} = ${data.movementType}`
      : sql``;

    interface AggregatedMovementRow {
      [key: string]: unknown;
      movement_type: string;
      reference_type: string | null;
      reference_id: string | null;
      movement_date: string;
      total_quantity: number;
      total_cost: number;
      movement_count: number;
      first_at: string;
      last_at: string;
      notes: string | null;
      running_balance: number;
      total_groups: number;
    }

    const result = (await db.execute(sql`
      WITH aggregated AS (
        SELECT
          ${inventoryMovements.movementType} as movement_type,
          ${inventoryMovements.referenceType} as reference_type,
          ${inventoryMovements.referenceId} as reference_id,
          DATE(${inventoryMovements.createdAt}) as movement_date,
          SUM(${inventoryMovements.quantity})::int as total_quantity,
          COALESCE(SUM(${inventoryMovements.totalCost}), 0)::numeric as total_cost,
          COUNT(*)::int as movement_count,
          MIN(${inventoryMovements.createdAt}) as first_at,
          MAX(${inventoryMovements.createdAt}) as last_at,
          (array_agg(${inventoryMovements.notes} ORDER BY ${inventoryMovements.createdAt} DESC))[1] as notes
        FROM ${inventoryMovements}
        WHERE ${inventoryMovements.productId} = ${data.productId}
          AND ${inventoryMovements.organizationId} = ${ctx.organizationId}
          ${movementTypeFilter}
        GROUP BY
          ${inventoryMovements.movementType},
          ${inventoryMovements.referenceType},
          ${inventoryMovements.referenceId},
          DATE(${inventoryMovements.createdAt})
      ),
      with_balance AS (
        SELECT *,
          SUM(total_quantity) OVER (
            ORDER BY movement_date ASC, first_at ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          )::int as running_balance
        FROM aggregated
      )
      SELECT *, (SELECT COUNT(*)::int FROM aggregated) as total_groups
      FROM with_balance
      ORDER BY movement_date DESC, last_at DESC
      LIMIT ${data.limit}
      OFFSET ${offset}
    `)) as unknown as AggregatedMovementRow[];

    const rows = result;

    const totalGroups = rows.length > 0 ? Number(rows[0].total_groups) : 0;

    return {
      movements: rows.map((r) => ({
        movementType: isValidMovementType(r.movement_type) ? r.movement_type : 'adjust',
        referenceType: r.reference_type,
        referenceId: r.reference_id,
        movementDate: r.movement_date,
        totalQuantity: Number(r.total_quantity) || 0,
        totalCost: Number(r.total_cost) || 0,
        movementCount: Number(r.movement_count) || 0,
        firstAt: r.first_at,
        lastAt: r.last_at,
        notes: r.notes,
        runningBalance: Number(r.running_balance) || 0,
      })),
      total: totalGroups,
      page: data.page,
      limit: data.limit,
    };
  });

/**
 * Get movement history for a location.
 */
export const getLocationMovements = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      locationId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      movementType: z.enum(movementTypeValues).optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(inventoryMovements.locationId, data.locationId),
      eq(inventoryMovements.organizationId, ctx.organizationId),
    ];

    if (data.movementType) {
      conditions.push(eq(inventoryMovements.movementType, data.movementType));
    }

    const offset = (data.page - 1) * data.limit;

    const [results, countResult] = await Promise.all([
      db
        .select({
          movement: inventoryMovements,
          product: {
            id: products.id,
            sku: products.sku,
            name: products.name,
          },
          location: {
            id: locations.id,
            locationCode: locations.locationCode,
            name: locations.name,
          },
        })
        .from(inventoryMovements)
        .innerJoin(products, eq(inventoryMovements.productId, products.id))
        .innerJoin(locations, eq(inventoryMovements.locationId, locations.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(data.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryMovements)
        .where(and(...conditions)),
    ]);

    return {
      movements: results.map((r) => ({
        ...r.movement,
        product: r.product,
        location: r.location,
      })) as MovementWithDetails[],
      total: countResult[0]?.count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

// ============================================================================
// LOW STOCK ALERTS
// ============================================================================

/**
 * Get low stock alerts.
 * Products with available quantity below reorder point (default: 10).
 */
export const getLowStockAlerts = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      reorderPoint: z.number().int().min(0).default(10),
      criticalThreshold: z.number().int().min(0).default(5),
      locationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }): Promise<LowStockAlert[]> => {
    const ctx = await withAuth();

    const conditions = [
      eq(inventory.organizationId, ctx.organizationId),
      lt(inventory.quantityAvailable, data.reorderPoint),
    ];

    if (data.locationId) {
      conditions.push(eq(inventory.locationId, data.locationId));
    }

    const results = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        locationId: locations.id,
        locationCode: locations.locationCode,
        locationName: locations.name,
        quantityAvailable: inventory.quantityAvailable,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(locations, eq(inventory.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(asc(inventory.quantityAvailable));

    return results.map((r) => ({
      productId: r.productId,
      sku: r.sku,
      name: r.name,
      locationId: r.locationId,
      locationCode: r.locationCode,
      locationName: r.locationName,
      // Drizzle's numericCasted automatically converts to number, no Number() needed
      quantityAvailable: r.quantityAvailable ?? 0,
      reorderPoint: data.reorderPoint,
      status: (r.quantityAvailable ?? 0) < data.criticalThreshold ? 'critical' : 'warning',
    }));
  });

/**
 * Get inventory statistics for a product.
 */
export const getInventoryStats = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Transaction ensures set_config and queries run on same connection (RLS)
    const [stats, movementStats] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      // Run both queries in parallel (same connection, shared RLS context)
      const [statsResult, movementResult] = await Promise.all([
        tx
          .select({
            totalOnHand: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
            totalAllocated: sql<number>`COALESCE(SUM(${inventory.quantityAllocated}), 0)::int`,
            totalAvailable: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)::int`,
            totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
            locationCount: sql<number>`COUNT(DISTINCT ${inventory.locationId})::int`,
            avgUnitCost: sql<number>`COALESCE(AVG(${inventory.unitCost}), 0)::numeric`,
          })
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, data.productId),
              eq(inventory.organizationId, ctx.organizationId)
            )
          )
          .then((rows) => rows[0]),
        tx
          .select({
            movementCount: sql<number>`COUNT(*)::int`,
            totalIn: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryMovements.quantity} > 0 THEN ${inventoryMovements.quantity} ELSE 0 END), 0)::int`,
            totalOut: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryMovements.quantity} < 0 THEN ABS(${inventoryMovements.quantity}) ELSE 0 END), 0)::int`,
          })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.productId, data.productId),
              eq(inventoryMovements.organizationId, ctx.organizationId),
              gte(inventoryMovements.createdAt, thirtyDaysAgo)
            )
          )
          .then((rows) => rows[0]),
      ]);

      return [statsResult, movementResult] as const;
    });

    return {
      totalOnHand: stats?.totalOnHand ?? 0,
      totalAllocated: stats?.totalAllocated ?? 0,
      totalAvailable: stats?.totalAvailable ?? 0,
      // Drizzle's sql<number> type annotation ensures these are numbers
      totalValue: stats?.totalValue ?? 0,
      locationCount: stats?.locationCount ?? 0,
      avgUnitCost: stats?.avgUnitCost ?? 0,
      last30Days: {
        movementCount: movementStats?.movementCount ?? 0,
        totalIn: movementStats?.totalIn ?? 0,
        totalOut: movementStats?.totalOut ?? 0,
      },
    };
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk receive stock for multiple products.
 * Optimized to avoid N+1 queries by batching operations.
 */
export const bulkReceiveStock = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      locationId: z.string().uuid(),
      items: z.array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive(),
          unitCost: z.number().min(0).optional(),
        })
      ),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const productIds = data.items.map((item) => item.productId);
      const results: Array<{
        productId: string;
        success: boolean;
        inventory?: Inventory;
        movement?: InventoryMovement;
        error?: string;
      }> = [];

      // Step 1: Validate all products exist (batch query)
      const existingProducts = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(inArray(products.id, productIds), eq(products.organizationId, ctx.organizationId))
        );

      const existingProductIds = new Set(existingProducts.map((p) => p.id));

      // Step 2: Get existing inventory records (batch query)
      const existingInventory = await tx
        .select()
        .from(inventory)
        .where(
          and(
            inArray(inventory.productId, productIds),
            eq(inventory.locationId, data.locationId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        );

      const inventoryMap = new Map(existingInventory.map((inv) => [inv.productId, inv]));

      // Step 3: Process each item and prepare batch operations
      const inventoryToCreate: Array<typeof inventory.$inferInsert> = [];
      const inventoryToUpdate: Array<{
        id: string;
        quantityOnHand: number;
        unitCost: number;
        totalValue: number;
      }> = [];
      const movementsToCreate: Array<typeof inventoryMovements.$inferInsert> = [];

      for (const item of data.items) {
        // Validate product exists
        if (!existingProductIds.has(item.productId)) {
          results.push({
            productId: item.productId,
            success: false,
            error: 'Product not found',
          });
          continue;
        }

        const existingInv = inventoryMap.get(item.productId);
        // Drizzle's numericCasted automatically converts to number, no Number() needed
        const previousQuantity = existingInv?.quantityOnHand ?? 0;
        const newQuantity = previousQuantity + item.quantity;
        const unitCost = item.unitCost ?? existingInv?.unitCost ?? 0;

        if (!existingInv) {
          // Queue for creation
          inventoryToCreate.push({
            organizationId: ctx.organizationId,
            productId: item.productId,
            locationId: data.locationId,
            status: 'available',
            quantityOnHand: item.quantity,
            quantityAllocated: 0,
            unitCost: unitCost,
            totalValue: unitCost * item.quantity,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        } else {
          // Queue for update
          // Note: existingInv.quantityAllocated available for future allocation tracking
          inventoryToUpdate.push({
            id: existingInv.id,
            quantityOnHand: newQuantity,
            unitCost: unitCost,
            totalValue: unitCost * newQuantity,
          });
        }
      }

      // Step 4: Execute batch inserts for new inventory records
      const createdInventory =
        inventoryToCreate.length > 0
          ? await tx.insert(inventory).values(inventoryToCreate).returning()
          : [];

      // Update inventory map with newly created records
      createdInventory.forEach((inv) => {
        inventoryMap.set(inv.productId, inv);
      });

      // Step 5: Execute batch updates for existing inventory records
      // PERFORMANCE: Use CASE statements for bulk update instead of N sequential queries
      if (inventoryToUpdate.length > 0) {
        const updateIds = inventoryToUpdate.map((u) => u.id);
        const caseStatements = {
          quantityOnHand: sql`CASE ${inventory.id}
            ${sql.join(
              inventoryToUpdate.map((u) => sql`WHEN ${u.id} THEN ${u.quantityOnHand}`),
              sql` `
            )}
            ELSE ${inventory.quantityOnHand}
          END`,
          unitCost: sql`CASE ${inventory.id}
            ${sql.join(
              inventoryToUpdate.map((u) => sql`WHEN ${u.id} THEN ${u.unitCost}`),
              sql` `
            )}
            ELSE ${inventory.unitCost}
          END`,
          totalValue: sql`CASE ${inventory.id}
            ${sql.join(
              inventoryToUpdate.map((u) => sql`WHEN ${u.id} THEN ${u.totalValue}`),
              sql` `
            )}
            ELSE ${inventory.totalValue}
          END`,
        };

        await tx
          .update(inventory)
          .set({
            quantityOnHand: caseStatements.quantityOnHand,
            unitCost: caseStatements.unitCost,
            totalValue: caseStatements.totalValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(inArray(inventory.id, updateIds));
      }

      // Step 6: Prepare movement records for all successful items
      for (const item of data.items) {
        if (!existingProductIds.has(item.productId)) {
          continue; // Skip invalid products
        }

        const inv = inventoryMap.get(item.productId);
        if (!inv) continue;

        // Drizzle's numericCasted automatically converts to number, no Number() needed
        const previousQuantity =
          existingInventory.find((i) => i.productId === item.productId)?.quantityOnHand ?? 0;
        const newQuantity = previousQuantity + item.quantity;
        const unitCost = item.unitCost ?? inv.unitCost ?? 0;

        movementsToCreate.push({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: item.productId,
          locationId: data.locationId,
          movementType: 'receive',
          quantity: item.quantity,
          previousQuantity: previousQuantity,
          newQuantity: newQuantity,
          unitCost: unitCost,
          totalCost: unitCost * item.quantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          notes: data.notes,
          createdBy: ctx.user.id,
        });
      }

      // Step 7: Batch insert movement records
      const createdMovements =
        movementsToCreate.length > 0
          ? await tx.insert(inventoryMovements).values(movementsToCreate).returning()
          : [];

      // Step 8: Build results array
      const movementsByProductId = new Map(createdMovements.map((m) => [m.productId, m]));

      for (const item of data.items) {
        if (!existingProductIds.has(item.productId)) {
          continue; // Already added error result
        }

        const inv = inventoryMap.get(item.productId);
        const movement = movementsByProductId.get(item.productId);

        results.push({
          productId: item.productId,
          success: true,
          inventory: inv as Inventory,
          movement: movement as InventoryMovement,
        });
      }

      return {
        success: true,
        itemCount: results.length,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
        results,
      };
    });
  });

/**
 * Get default location for the organization.
 */
export const getDefaultLocation = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth();

    // Try to find default location
    let [location] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.organizationId, ctx.organizationId),
          eq(locations.isActive, true),
          sql`COALESCE((${locations.attributes}->>'isDefault')::boolean, false)`
        )
      )
      .limit(1);

    // Fallback to any active location
    if (!location) {
      [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.organizationId, ctx.organizationId), eq(locations.isActive, true)))
        .orderBy(asc(locations.createdAt))
        .limit(1);
    }

    return location as Location | null;
  });

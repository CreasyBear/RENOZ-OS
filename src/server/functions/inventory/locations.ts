/**
 * Location Management Server Functions
 *
 * Warehouse location hierarchy management with capacity planning.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  warehouseLocations as locations,
  warehouseLocations,
  inventory,
  products,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/server/errors';
import {
  createLocationSchema,
  updateLocationSchema,
  locationListQuerySchema,
  warehouseLocationListQuerySchema,
  createWarehouseLocationSchema,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

type LocationRecord = typeof locations.$inferSelect;
type WarehouseLocationRecord = typeof warehouseLocations.$inferSelect;

interface WarehouseLocationWithChildren extends WarehouseLocationRecord {
  children: WarehouseLocationWithChildren[];
  inventoryCount?: number;
  utilization?: number;
}

interface ListLocationsResult {
  locations: LocationRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// SIMPLE LOCATIONS (Storage Locations)
// ============================================================================

/**
 * List simple locations with filtering and pagination.
 */
export const listLocations = createServerFn({ method: 'GET' })
  .inputValidator(locationListQuerySchema)
  .handler(async ({ data }): Promise<ListLocationsResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, search, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(locations.organizationId, ctx.organizationId)];

    if (search) {
      conditions.push(
        sql`(
          ${locations.locationCode} ILIKE ${`%${search}%`} OR
          ${locations.name} ILIKE ${`%${search}%`}
        )`
      );
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(locations.isActive, filters.isActive));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(locations)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Build order clause
    const orderColumn =
      sortBy === 'code' ? locations.locationCode : sortBy === 'name' ? locations.name : locations.createdAt;
    const orderDir = sortOrder === 'asc' ? asc : desc;

    // Get locations with pagination
    const offset = (page - 1) * limit;
    const locationList = await db
      .select()
      .from(locations)
      .where(and(...conditions))
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      locations: locationList,
      total,
      page,
      limit,
      hasMore: offset + locationList.length < total,
    };
  });

/**
 * Get single location with inventory contents.
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

    // Get inventory in this location
    const inventoryRows = await db
      .select({
        item: inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.locationId, data.id))
      .orderBy(desc(inventory.updatedAt));

    const inventoryItems = inventoryRows.map(({ item, product }) => ({
      ...item,
      product,
    }));

    // Get utilization metrics
    const [metrics] = await db
      .select({
        itemCount: sql<number>`COUNT(*)::int`,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      })
      .from(inventory)
      .where(eq(inventory.locationId, data.id));

    return {
      location,
      contents: inventoryItems,
      metrics: {
        itemCount: metrics?.itemCount ?? 0,
        totalQuantity: metrics?.totalQuantity ?? 0,
        totalValue: Number(metrics?.totalValue ?? 0),
      },
    };
  });

/**
 * Create a new simple location.
 */
export const createLocation = createServerFn({ method: 'POST' })
  .inputValidator(createLocationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Check for duplicate code
    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.organizationId, ctx.organizationId), eq(locations.locationCode, data.code)))
      .limit(1);

    if (existing) {
      throw new ConflictError(`Location with code '${data.code}' already exists`);
    }

    // If this is set as default, unset others
    if (data.isDefault) {
      await db
        .update(locations)
        .set({
          attributes: sql`jsonb_set(COALESCE(${locations.attributes}, '{}'::jsonb), '{isDefault}', 'false'::jsonb)`
        })
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            sql`(${locations.attributes}->>'isDefault')::boolean = true`
          )
        );
    }

    const [location] = await db
      .insert(locations)
      .values({
        organizationId: ctx.organizationId,
        locationCode: data.code,
        name: data.name,
        locationType: 'warehouse' as const,
        isActive: data.isActive,
        attributes: {
          isDefault: data.isDefault,
          allowNegative: data.allowNegative,
          description: data.description,
          address: data.address,
        },
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { location };
  });

/**
 * Update an existing location.
 */
export const updateLocation = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateLocationSchema,
    })
  )
  .handler(async ({ data: { id, data } }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Location not found', 'location');
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== existing.locationCode) {
      const [duplicate] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            eq(locations.locationCode, data.code),
            ne(locations.id, id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictError(`Location with code '${data.code}' already exists`);
      }
    }

    // If setting as default, unset others
    const existingIsDefault = (existing.attributes as any)?.isDefault ?? false;
    if (data.isDefault && !existingIsDefault) {
      await db
        .update(locations)
        .set({
          attributes: sql`jsonb_set(COALESCE(${locations.attributes}, '{}'::jsonb), '{isDefault}', 'false'::jsonb)`
        })
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            sql`(${locations.attributes}->>'isDefault')::boolean = true`
          )
        );
    }

    // Build update values
    const updateValues: any = {
      updatedAt: new Date(),
      updatedBy: ctx.user.id,
    };

    if (data.code !== undefined) {
      updateValues.locationCode = data.code;
    }
    if (data.name !== undefined) {
      updateValues.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateValues.isActive = data.isActive;
    }

    // Update attributes if any attribute fields are provided
    if (data.isDefault !== undefined || data.allowNegative !== undefined || data.description !== undefined || data.address !== undefined) {
      const attributeUpdates: any = {};
      if (data.isDefault !== undefined) attributeUpdates.isDefault = data.isDefault;
      if (data.allowNegative !== undefined) attributeUpdates.allowNegative = data.allowNegative;
      if (data.description !== undefined) attributeUpdates.description = data.description;
      if (data.address !== undefined) attributeUpdates.address = data.address;

      updateValues.attributes = sql`COALESCE(${locations.attributes}, '{}'::jsonb) || ${JSON.stringify(attributeUpdates)}::jsonb`;
    }

    const [location] = await db
      .update(locations)
      .set(updateValues)
      .where(eq(locations.id, id))
      .returning();

    return { location };
  });

/**
 * Delete a location (if empty).
 */
export const deleteLocation = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, data.id), eq(locations.organizationId, ctx.organizationId)))
      .limit(1);

    if (!location) {
      throw new NotFoundError('Location not found', 'location');
    }

    // Check for inventory in this location
    const [inventoryCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(eq(inventory.locationId, data.id));

    if ((inventoryCount?.count ?? 0) > 0) {
      throw new ConflictError(
        `Cannot delete location with ${inventoryCount?.count} inventory items. Transfer or remove inventory first.`
      );
    }

    await db.delete(locations).where(eq(locations.id, data.id));

    return { success: true };
  });

// ============================================================================
// WAREHOUSE LOCATIONS (Hierarchical)
// ============================================================================

// Schema imported from centralized location

/**
 * List warehouse locations with hierarchy.
 */
export const listWarehouseLocations = createServerFn({ method: 'GET' })
  .inputValidator(warehouseLocationListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(warehouseLocations.organizationId, ctx.organizationId)];

    // Filter by parent (null for root locations)
    if (data.parentId === null || data.parentId === undefined) {
      if (!data.search) {
        conditions.push(isNull(warehouseLocations.parentId));
      }
    } else if (data.parentId) {
      conditions.push(eq(warehouseLocations.parentId, data.parentId));
    }

    if (data.locationType) {
      conditions.push(eq(warehouseLocations.locationType, data.locationType));
    }

    if (data.isActive !== undefined) {
      conditions.push(eq(warehouseLocations.isActive, data.isActive));
    }

    if (data.search) {
      conditions.push(
        sql`(
          ${warehouseLocations.locationCode} ILIKE ${`%${data.search}%`} OR
          ${warehouseLocations.name} ILIKE ${`%${data.search}%`}
        )`
      );
    }

    const locationList = await db
      .select()
      .from(warehouseLocations)
      .where(and(...conditions))
      .orderBy(asc(warehouseLocations.locationType), asc(warehouseLocations.locationCode));

    return { locations: locationList };
  });

/**
 * Get warehouse location hierarchy from a starting point.
 */
export const getWarehouseLocationHierarchy = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Build tree recursively using a CTE
    const hierarchy = await db.execute<WarehouseLocationRecord & { level: number }>(
      sql`
        WITH RECURSIVE location_tree AS (
          -- Base case: starting location(s)
          SELECT wl.*, 0 as level
          FROM warehouse_locations wl
          WHERE wl.organization_id = ${ctx.organizationId}
            AND ${data.id ? sql`wl.id = ${data.id}` : sql`wl.parent_id IS NULL`}

          UNION ALL

          -- Recursive case: children
          SELECT wl.*, lt.level + 1
          FROM warehouse_locations wl
          JOIN location_tree lt ON wl.parent_id = lt.id
          WHERE wl.organization_id = ${ctx.organizationId}
        )
        SELECT * FROM location_tree
        ORDER BY level, location_type, location_code
      `
    );

    // Convert flat list to tree structure
    const buildTree = (
      items: (WarehouseLocationRecord & { level: number })[],
      parentId: string | null = null
    ): WarehouseLocationWithChildren[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(hierarchy as unknown as (WarehouseLocationRecord & { level: number })[]);

    return { hierarchy: tree };
  });

// Schema imported from centralized location

/**
 * Create a warehouse location.
 */
export const createWarehouseLocation = createServerFn({ method: 'POST' })
  .inputValidator(createWarehouseLocationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Check for duplicate code
    const [existing] = await db
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.organizationId, ctx.organizationId),
          eq(warehouseLocations.locationCode, data.locationCode)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError(`Warehouse location with code '${data.locationCode}' already exists`);
    }

    // Validate parent exists if specified
    if (data.parentId) {
      const [parent] = await db
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.id, data.parentId),
            eq(warehouseLocations.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!parent) {
        throw new NotFoundError('Parent location not found', 'warehouseLocation');
      }
    }

    const [location] = await db
      .insert(warehouseLocations)
      .values({
        organizationId: ctx.organizationId,
        ...data,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return { location };
  });

const updateWarehouseLocationInputSchema = createWarehouseLocationSchema.partial();

/**
 * Update a warehouse location.
 */
export const updateWarehouseLocation = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      data: updateWarehouseLocationInputSchema,
    })
  )
  .handler(async ({ data: { id, data } }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [existing] = await db
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.id, id),
          eq(warehouseLocations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Warehouse location not found', 'warehouseLocation');
    }

    // Check for duplicate code if changing
    if (data.locationCode && data.locationCode !== existing.locationCode) {
      const [duplicate] = await db
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.organizationId, ctx.organizationId),
            eq(warehouseLocations.locationCode, data.locationCode),
            ne(warehouseLocations.id, id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictError(
          `Warehouse location with code '${data.locationCode}' already exists`
        );
      }
    }

    // Prevent circular hierarchy
    if (data.parentId && data.parentId !== existing.parentId) {
      // Check if new parent is not a descendant
      const descendants = await db.execute<{ id: string }>(
        sql`
          WITH RECURSIVE descendants AS (
            SELECT id FROM warehouse_locations WHERE parent_id = ${id}
            UNION ALL
            SELECT wl.id FROM warehouse_locations wl
            JOIN descendants d ON wl.parent_id = d.id
          )
          SELECT id FROM descendants WHERE id = ${data.parentId}
        `
      );

      if ((descendants as unknown as { id: string }[]).length > 0) {
        throw new ValidationError('Cannot set parent to a descendant location', {
          parentId: ['Would create circular hierarchy'],
        });
      }
    }

    const [location] = await db
      .update(warehouseLocations)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
        version: sql`${warehouseLocations.version} + 1`,
      })
      .where(eq(warehouseLocations.id, id))
      .returning();

    return { location };
  });

/**
 * Delete a warehouse location (if empty and no children).
 */
export const deleteWarehouseLocation = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [location] = await db
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.id, data.id),
          eq(warehouseLocations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!location) {
      throw new NotFoundError('Warehouse location not found', 'warehouseLocation');
    }

    // Check for children
    const [childCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warehouseLocations)
      .where(eq(warehouseLocations.parentId, data.id));

    if ((childCount?.count ?? 0) > 0) {
      throw new ConflictError(
        `Cannot delete location with ${childCount?.count} child locations. Delete children first.`
      );
    }

    await db.delete(warehouseLocations).where(eq(warehouseLocations.id, data.id));

    return { success: true };
  });

/**
 * Get location utilization across all locations.
 */
export const getLocationUtilization = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const utilization = await db
    .select({
      locationId: warehouseLocations.id,
      locationCode: warehouseLocations.locationCode,
      name: warehouseLocations.name,
      locationType: warehouseLocations.locationType,
      capacity: warehouseLocations.capacity,
      itemCount: sql<number>`COUNT(DISTINCT ${inventory.id})::int`,
      totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
    })
    .from(warehouseLocations)
    .leftJoin(inventory, eq(inventory.locationId, warehouseLocations.id))
    .where(eq(warehouseLocations.organizationId, ctx.organizationId))
    .groupBy(
      warehouseLocations.id,
      warehouseLocations.locationCode,
      warehouseLocations.name,
      warehouseLocations.locationType,
      warehouseLocations.capacity
    )
    .orderBy(asc(warehouseLocations.locationType), asc(warehouseLocations.locationCode));

  // Calculate utilization percentages
  const withUtilization = utilization.map((loc) => ({
    ...loc,
    totalValue: Number(loc.totalValue),
    utilization:
      loc.capacity && loc.capacity > 0
        ? Math.round((loc.totalQuantity / loc.capacity) * 100)
        : null,
  }));

  return { locations: withUtilization };
});

/**
 * Bulk create locations (for initial setup or import).
 */
export const bulkCreateLocations = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      locations: z.array(createWarehouseLocationSchema).min(1).max(500),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Check for duplicate codes within the batch
    const codes = data.locations.map((l) => l.locationCode);
    const uniqueCodes = new Set(codes);
    if (codes.length !== uniqueCodes.size) {
      throw new ValidationError('Duplicate location codes in batch', {
        locations: ['Location codes must be unique'],
      });
    }

    // Check for existing codes
    const existingCodes = await db
      .select({ code: warehouseLocations.locationCode })
      .from(warehouseLocations)
      .where(eq(warehouseLocations.organizationId, ctx.organizationId));

    const existingSet = new Set(existingCodes.map((e) => e.code));
    const conflicts = codes.filter((c) => existingSet.has(c));

    if (conflicts.length > 0) {
      throw new ConflictError(
        `Location codes already exist: ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? '...' : ''}`
      );
    }

    const inserted = await db
      .insert(warehouseLocations)
      .values(
        data.locations.map((loc) => ({
          organizationId: ctx.organizationId,
          ...loc,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        }))
      )
      .returning();

    return {
      createdCount: inserted.length,
      locations: inserted,
    };
  });

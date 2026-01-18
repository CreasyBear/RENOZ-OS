/**
 * Product Inventory Server Functions
 *
 * Inventory tracking, stock movements, allocations, and location management.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc, asc, sql, isNull, lt, gte, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  products,
  inventory,
  inventoryMovements,
  locations,
} from "../../../../drizzle/schema";
import { withAuth } from "../protected";
import { NotFoundError, ValidationError } from "../errors";
import {
  createLocationSchema,
  updateLocationSchema,
  createMovementSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  inventoryStatusValues,
  movementTypeValues,
} from "@/lib/schemas/inventory";

// ============================================================================
// TYPES
// ============================================================================

type Location = typeof locations.$inferSelect;
type Inventory = typeof inventory.$inferSelect;
type InventoryMovement = typeof inventoryMovements.$inferSelect;
type Product = typeof products.$inferSelect;

interface InventoryWithProduct extends Inventory {
  product: Pick<Product, "id" | "sku" | "name" | "type" | "status">;
}

interface ProductInventorySummary {
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
  product: Pick<Product, "id" | "sku" | "name">;
  location: Pick<Location, "id" | "code" | "name">;
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
  status: "critical" | "warning";
}

// ============================================================================
// LOCATION CRUD
// ============================================================================

/**
 * List all locations for the organization.
 */
export const listLocations = createServerFn({ method: "GET" })
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
      locations: results as Location[],
      total: countResult[0]?.count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

/**
 * Get a single location by ID.
 */
export const getLocation = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, data.id),
          eq(locations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!location) {
      throw new NotFoundError("Location not found", "location");
    }

    return location as Location;
  });

/**
 * Create a new location.
 */
export const createLocation = createServerFn({ method: "POST" })
  .inputValidator(createLocationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check for duplicate code
    const [existing] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.organizationId, ctx.organizationId),
          eq(locations.code, data.code)
        )
      )
      .limit(1);

    if (existing) {
      throw new ValidationError("Location code already exists", { code: ["Location code already exists"] });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(locations)
        .set({ isDefault: false })
        .where(eq(locations.organizationId, ctx.organizationId));
    }

    const [location] = await db
      .insert(locations)
      .values({
        organizationId: ctx.organizationId,
        code: data.code,
        name: data.name,
        description: data.description,
        address: data.address ?? {},
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        allowNegative: data.allowNegative ?? false,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return location as Location;
  });

/**
 * Update a location.
 */
export const updateLocation = createServerFn({ method: "POST" })
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
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.id, data.id),
          eq(locations.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Location not found", "location");
    }

    // Check for duplicate code if changing
    if (data.data.code) {
      const [duplicate] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            eq(locations.code, data.data.code),
            sql`${locations.id} != ${data.id}`
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ValidationError("Location code already exists", { code: ["Location code already exists"] });
      }
    }

    // If setting as default, unset other defaults
    if (data.data.isDefault) {
      await db
        .update(locations)
        .set({ isDefault: false })
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            sql`${locations.id} != ${data.id}`
          )
        );
    }

    const [location] = await db
      .update(locations)
      .set({
        ...data.data,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(locations.id, data.id),
          eq(locations.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return location as Location;
  });

/**
 * Delete a location (soft deactivate if has inventory).
 */
export const deleteLocation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check for existing inventory
    const [hasInventory] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(
        and(
          eq(inventory.locationId, data.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
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
        .where(
          and(
            eq(locations.id, data.id),
            eq(locations.organizationId, ctx.organizationId)
          )
        );

      return { deleted: false, deactivated: true };
    }

    // Hard delete if no inventory
    await db
      .delete(locations)
      .where(
        and(
          eq(locations.id, data.id),
          eq(locations.organizationId, ctx.organizationId)
        )
      );

    return { deleted: true, deactivated: false };
  });

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

/**
 * Get inventory for a product across all locations.
 */
export const getProductInventory = createServerFn({ method: "GET" })
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
      throw new NotFoundError("Product not found", "product");
    }

    // Get inventory by location
    const inventoryByLocation = await db
      .select({
        inventoryId: inventory.id,
        locationId: inventory.locationId,
        locationCode: locations.code,
        locationName: locations.name,
        quantityOnHand: inventory.quantityOnHand,
        quantityAllocated: inventory.quantityAllocated,
        quantityAvailable: inventory.quantityAvailable,
        totalValue: inventory.totalValue,
      })
      .from(inventory)
      .innerJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(inventory.productId, data.productId),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(locations.name));

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
        const onHand = Number(inv.quantityOnHand) || 0;
        const allocated = Number(inv.quantityAllocated) || 0;
        const available = Number(inv.quantityAvailable) || 0;

        return {
          locationId: inv.locationId,
          locationCode: inv.locationCode,
          locationName: inv.locationName,
          quantityOnHand: onHand,
          quantityAllocated: allocated,
          quantityAvailable: available,
        };
      }),
    };

    // Calculate totals
    for (const loc of inventoryByLocation) {
      summary.totalOnHand += Number(loc.quantityOnHand) || 0;
      summary.totalAllocated += Number(loc.quantityAllocated) || 0;
      summary.totalAvailable += Number(loc.quantityAvailable) || 0;
      summary.totalValue += Number(loc.totalValue) || 0;
    }

    return summary;
  });

/**
 * Get inventory for a location.
 */
export const getLocationInventory = createServerFn({ method: "GET" })
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
      const searchPattern = `%${data.search}%`;
      searchCondition = or(
        sql`${products.sku} ILIKE ${searchPattern}`,
        sql`${products.name} ILIKE ${searchPattern}`
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
      .where(
        searchCondition
          ? and(...conditions, searchCondition)
          : and(...conditions)
      );

    const [results, countResult] = await Promise.all([
      baseQuery
        .orderBy(asc(products.name))
        .limit(data.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(
          searchCondition
            ? and(...conditions, searchCondition)
            : and(...conditions)
        ),
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
export const recordMovement = createServerFn({ method: "POST" })
  .inputValidator(createMovementSchema)
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
      // Get or create inventory record
      let [inv] = await tx
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

      const previousQuantity = Number(inv?.quantityOnHand) || 0;
      const newQuantity = previousQuantity + data.quantity;

      // Check for negative inventory
      if (newQuantity < 0) {
        // Check if location allows negative
        const [location] = await tx
          .select({ allowNegative: locations.allowNegative })
          .from(locations)
          .where(eq(locations.id, data.locationId))
          .limit(1);

        if (!location?.allowNegative) {
          throw new ValidationError(
            `Insufficient stock. Available: ${previousQuantity}, Requested: ${Math.abs(data.quantity)}`,
            { quantity: [`Insufficient stock. Available: ${previousQuantity}, Requested: ${Math.abs(data.quantity)}`] }
          );
        }
      }

      if (!inv) {
        // Create new inventory record
        [inv] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: "available",
            quantityOnHand: data.quantity,
            quantityAllocated: 0,
            quantityAvailable: data.quantity,
            unitCost: data.unitCost ?? 0,
            totalValue: (data.unitCost ?? 0) * data.quantity,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        // Update existing inventory
        const allocated = Number(inv.quantityAllocated) || 0;
        const unitCost = data.unitCost ?? Number(inv.unitCost) ?? 0;

        [inv] = await tx
          .update(inventory)
          .set({
            quantityOnHand: newQuantity,
            quantityAvailable: newQuantity - allocated,
            unitCost: unitCost,
            totalValue: unitCost * newQuantity,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, inv.id))
          .returning();
      }

      // Record the movement
      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: data.productId,
          locationId: data.locationId,
          movementType: data.movementType,
          quantity: data.quantity,
          previousQuantity: previousQuantity,
          newQuantity: newQuantity,
          unitCost: data.unitCost ?? 0,
          totalCost: (data.unitCost ?? 0) * Math.abs(data.quantity),
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          metadata: data.metadata ?? {},
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      return {
        inventory: inv as Inventory,
        movement: movement as InventoryMovement,
      };
    });
  });

/**
 * Receive stock into a location.
 */
export const receiveStock = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive("Quantity must be positive"),
      unitCost: z.number().min(0).optional(),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    return recordMovement({
      data: {
        ...data,
        movementType: "receive",
      },
    });
  });

/**
 * Allocate stock for an order.
 */
export const allocateStock = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive("Quantity must be positive"),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
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
        throw new NotFoundError("No inventory found for this product at this location", "inventory");
      }

      const available = Number(inv.quantityAvailable) || 0;
      if (data.quantity > available) {
        throw new ValidationError(
          `Insufficient available stock. Available: ${available}, Requested: ${data.quantity}`,
          { quantity: [`Insufficient available stock. Available: ${available}, Requested: ${data.quantity}`] }
        );
      }

      const previousAllocated = Number(inv.quantityAllocated) || 0;
      const newAllocated = previousAllocated + data.quantity;
      const newAvailable = available - data.quantity;

      // Update inventory
      await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          quantityAvailable: newAvailable,
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
          movementType: "allocate",
          quantity: -data.quantity, // Negative because available is reduced
          previousQuantity: available,
          newQuantity: newAvailable,
          unitCost: Number(inv.unitCost) || 0,
          totalCost: (Number(inv.unitCost) || 0) * data.quantity,
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
export const deallocateStock = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      locationId: z.string().uuid(),
      quantity: z.number().positive("Quantity must be positive"),
      referenceType: z.string().optional(),
      referenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  )
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
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
        throw new NotFoundError("No inventory found", "inventory");
      }

      const allocated = Number(inv.quantityAllocated) || 0;
      if (data.quantity > allocated) {
        throw new ValidationError(
          `Cannot deallocate more than allocated. Allocated: ${allocated}, Requested: ${data.quantity}`,
          { quantity: [`Cannot deallocate more than allocated. Allocated: ${allocated}, Requested: ${data.quantity}`] }
        );
      }

      const previousAvailable = Number(inv.quantityAvailable) || 0;
      const newAllocated = allocated - data.quantity;
      const newAvailable = previousAvailable + data.quantity;

      // Update inventory
      await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          quantityAvailable: newAvailable,
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
          movementType: "deallocate",
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
export const adjustStock = createServerFn({ method: "POST" })
  .inputValidator(stockAdjustmentSchema)
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    return recordMovement({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        movementType: "adjust",
        quantity: data.adjustmentQty,
        notes: data.notes,
        metadata: { reason: data.reason },
      },
    });
  });

/**
 * Transfer stock between locations.
 */
export const transferStock = createServerFn({ method: "POST" })
  .inputValidator(stockTransferSchema)
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
      // Check source inventory
      const [sourceInv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.fromLocationId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!sourceInv) {
        throw new NotFoundError("No inventory at source location", "fromLocation");
      }

      const sourceAvailable = Number(sourceInv.quantityAvailable) || 0;
      if (data.quantity > sourceAvailable) {
        throw new ValidationError(
          `Insufficient available stock at source. Available: ${sourceAvailable}, Requested: ${data.quantity}`,
          { quantity: [`Insufficient available stock at source. Available: ${sourceAvailable}, Requested: ${data.quantity}`] }
        );
      }

      // Deduct from source
      const sourceOnHand = Number(sourceInv.quantityOnHand) || 0;
      const newSourceOnHand = sourceOnHand - data.quantity;
      const sourceAllocated = Number(sourceInv.quantityAllocated) || 0;
      const newSourceAvailable = newSourceOnHand - sourceAllocated;
      const unitCost = Number(sourceInv.unitCost) || 0;

      await tx
        .update(inventory)
        .set({
          quantityOnHand: newSourceOnHand,
          quantityAvailable: newSourceAvailable,
          totalValue: unitCost * newSourceOnHand,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, sourceInv.id));

      // Record source movement
      await tx.insert(inventoryMovements).values({
        organizationId: ctx.organizationId,
        inventoryId: sourceInv.id,
        productId: data.productId,
        locationId: data.fromLocationId,
        movementType: "transfer",
        quantity: -data.quantity,
        previousQuantity: sourceOnHand,
        newQuantity: newSourceOnHand,
        unitCost: unitCost,
        totalCost: unitCost * data.quantity,
        referenceType: "transfer",
        metadata: { toLocationId: data.toLocationId },
        notes: data.notes,
        createdBy: ctx.user.id,
      });

      // Get or create destination inventory
      let [destInv] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.toLocationId),
            eq(inventory.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      const destPreviousOnHand = Number(destInv?.quantityOnHand) || 0;
      const destNewOnHand = destPreviousOnHand + data.quantity;

      if (!destInv) {
        // Create new inventory record at destination
        [destInv] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.toLocationId,
            status: "available",
            quantityOnHand: data.quantity,
            quantityAllocated: 0,
            quantityAvailable: data.quantity,
            unitCost: unitCost,
            totalValue: unitCost * data.quantity,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        // Update existing destination inventory
        const destAllocated = Number(destInv.quantityAllocated) || 0;

        [destInv] = await tx
          .update(inventory)
          .set({
            quantityOnHand: destNewOnHand,
            quantityAvailable: destNewOnHand - destAllocated,
            totalValue: unitCost * destNewOnHand,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, destInv.id))
          .returning();
      }

      // Record destination movement
      const [destMovement] = await tx
        .insert(inventoryMovements)
        .values({
          organizationId: ctx.organizationId,
          inventoryId: destInv.id,
          productId: data.productId,
          locationId: data.toLocationId,
          movementType: "transfer",
          quantity: data.quantity,
          previousQuantity: destPreviousOnHand,
          newQuantity: destNewOnHand,
          unitCost: unitCost,
          totalCost: unitCost * data.quantity,
          referenceType: "transfer",
          metadata: { fromLocationId: data.fromLocationId },
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      return {
        sourceInventory: {
          ...sourceInv,
          quantityOnHand: newSourceOnHand,
          quantityAvailable: newSourceAvailable,
        } as Inventory,
        destinationInventory: destInv as Inventory,
        movement: destMovement as InventoryMovement,
      };
    });
  });

// ============================================================================
// MOVEMENT HISTORY
// ============================================================================

/**
 * Get movement history for a product.
 */
export const getProductMovements = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      movementType: z.enum(movementTypeValues).optional(),
      locationId: z.string().uuid().optional(),
    })
  )
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
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
            code: locations.code,
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
 * Get movement history for a location.
 */
export const getLocationMovements = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      locationId: z.string().uuid(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      movementType: z.enum(movementTypeValues).optional(),
    })
  )
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
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
            code: locations.code,
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
export const getLowStockAlerts = createServerFn({ method: "GET" })
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
        locationCode: locations.code,
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
      quantityAvailable: Number(r.quantityAvailable) || 0,
      reorderPoint: data.reorderPoint,
      status:
        (Number(r.quantityAvailable) || 0) < data.criticalThreshold
          ? "critical"
          : "warning",
    }));
  });

/**
 * Get inventory statistics for a product.
 */
export const getInventoryStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get aggregated stats
    const [stats] = await db
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
      );

    // Get recent movement count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [movementStats] = await db
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
      );

    return {
      totalOnHand: stats?.totalOnHand ?? 0,
      totalAllocated: stats?.totalAllocated ?? 0,
      totalAvailable: stats?.totalAvailable ?? 0,
      totalValue: Number(stats?.totalValue) ?? 0,
      locationCount: stats?.locationCount ?? 0,
      avgUnitCost: Number(stats?.avgUnitCost) ?? 0,
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
export const bulkReceiveStock = createServerFn({ method: "POST" })
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
  // @ts-expect-error - TanStack Start typing issue: handler expects ServerFn but infers ServerFnCtx
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return await db.transaction(async (tx) => {
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
          and(
            inArray(products.id, productIds),
            eq(products.organizationId, ctx.organizationId)
          )
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

      const inventoryMap = new Map(
        existingInventory.map((inv) => [inv.productId, inv])
      );

      // Step 3: Process each item and prepare batch operations
      const inventoryToCreate: Array<typeof inventory.$inferInsert> = [];
      const inventoryToUpdate: Array<{
        id: string;
        quantityOnHand: number;
        quantityAvailable: number;
        unitCost: number;
        totalValue: number;
      }> = [];
      const movementsToCreate: Array<typeof inventoryMovements.$inferInsert> =
        [];

      for (const item of data.items) {
        // Validate product exists
        if (!existingProductIds.has(item.productId)) {
          results.push({
            productId: item.productId,
            success: false,
            error: "Product not found",
          });
          continue;
        }

        const existingInv = inventoryMap.get(item.productId);
        const previousQuantity = Number(existingInv?.quantityOnHand) || 0;
        const newQuantity = previousQuantity + item.quantity;
        const unitCost = item.unitCost ?? Number(existingInv?.unitCost) ?? 0;

        if (!existingInv) {
          // Queue for creation
          inventoryToCreate.push({
            organizationId: ctx.organizationId,
            productId: item.productId,
            locationId: data.locationId,
            status: "available",
            quantityOnHand: item.quantity,
            quantityAllocated: 0,
            quantityAvailable: item.quantity,
            unitCost: unitCost,
            totalValue: unitCost * item.quantity,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        } else {
          // Queue for update
          const allocated = Number(existingInv.quantityAllocated) || 0;
          inventoryToUpdate.push({
            id: existingInv.id,
            quantityOnHand: newQuantity,
            quantityAvailable: newQuantity - allocated,
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
      for (const update of inventoryToUpdate) {
        await tx
          .update(inventory)
          .set({
            quantityOnHand: update.quantityOnHand,
            quantityAvailable: update.quantityAvailable,
            unitCost: update.unitCost,
            totalValue: update.totalValue,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, update.id));
      }

      // Step 6: Prepare movement records for all successful items
      for (const item of data.items) {
        if (!existingProductIds.has(item.productId)) {
          continue; // Skip invalid products
        }

        const inv = inventoryMap.get(item.productId);
        if (!inv) continue;

        const previousQuantity =
          Number(
            existingInventory.find((i) => i.productId === item.productId)
              ?.quantityOnHand
          ) || 0;
        const newQuantity = previousQuantity + item.quantity;
        const unitCost = item.unitCost ?? Number(inv.unitCost) ?? 0;

        movementsToCreate.push({
          organizationId: ctx.organizationId,
          inventoryId: inv.id,
          productId: item.productId,
          locationId: data.locationId,
          movementType: "receive",
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
          ? await tx
              .insert(inventoryMovements)
              .values(movementsToCreate)
              .returning()
          : [];

      // Step 8: Build results array
      const movementsByProductId = new Map(
        createdMovements.map((m) => [m.productId, m])
      );

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
export const getDefaultLocation = createServerFn({ method: "GET" })
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
          eq(locations.isDefault, true),
          eq(locations.isActive, true)
        )
      )
      .limit(1);

    // Fallback to any active location
    if (!location) {
      [location] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, ctx.organizationId),
            eq(locations.isActive, true)
          )
        )
        .orderBy(asc(locations.createdAt))
        .limit(1);
    }

    return location as Location | null;
  });

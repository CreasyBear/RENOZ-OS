/**
 * Inventory Server Functions
 *
 * Comprehensive inventory CRUD, adjustments, transfers, and allocation operations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, sql, desc, asc, isNull, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  inventory,
  inventoryMovements,
  warehouseLocations,
  products,
  inventoryCostLayers,
} from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NotFoundError, ValidationError } from "@/lib/server/errors";
import {
  inventoryListQuerySchema,
  movementListQuerySchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  inventoryStatusSchema,
} from "@/lib/schemas/inventory";

// ============================================================================
// TYPES
// ============================================================================

type InventoryRecord = typeof inventory.$inferSelect;
type InventoryMovementRecord = typeof inventoryMovements.$inferSelect;

interface ListInventoryResult {
  items: InventoryRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totals: {
    totalValue: number;
    totalItems: number;
    lowStockCount: number;
  };
}

interface InventoryWithRelations extends InventoryRecord {
  product: typeof products.$inferSelect | null;
  location: typeof warehouseLocations.$inferSelect | null;
}

interface ListMovementsResult {
  movements: InventoryMovementRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    totalInbound: number;
    totalOutbound: number;
    netChange: number;
  };
}

// ============================================================================
// INVENTORY CRUD
// ============================================================================

/**
 * List inventory items with advanced filtering, sorting, and pagination.
 */
export const listInventory = createServerFn({ method: "GET" })
  .inputValidator(inventoryListQuerySchema)
  .handler(async ({ data }): Promise<ListInventoryResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, search, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(inventory.organizationId, ctx.organizationId)];

    // Add search filter
    if (search) {
      conditions.push(
        sql`(
          ${inventory.lotNumber} ILIKE ${`%${search}%`} OR
          ${inventory.serialNumber} ILIKE ${`%${search}%`}
        )`
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
      conditions.push(eq(inventory.status, filters.status));
    }
    if (filters.lowStock) {
      // Low stock means available quantity is below a threshold (e.g., 10)
      conditions.push(sql`${inventory.quantityAvailable} < 10`);
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get totals for dashboard metrics
    const [totalsResult] = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalItems: sql<number>`COUNT(*)::int`,
        lowStockCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.quantityAvailable} < 10)::int`,
      })
      .from(inventory)
      .where(and(...conditions));

    // Build order clause
    const orderColumn =
      sortBy === "quantityOnHand"
        ? inventory.quantityOnHand
        : sortBy === "totalValue"
          ? inventory.totalValue
          : sortBy === "status"
            ? inventory.status
            : inventory.createdAt;
    const orderDir = sortOrder === "asc" ? asc : desc;

    // Get inventory items with pagination
    const offset = (page - 1) * limit;
    const items = await db
      .select()
      .from(inventory)
      .where(and(...conditions))
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      totals: {
        totalValue: Number(totalsResult?.totalValue ?? 0),
        totalItems: totalsResult?.totalItems ?? 0,
        lowStockCount: totalsResult?.lowStockCount ?? 0,
      },
    };
  });

/**
 * Get single inventory item with all related data.
 */
export const getInventoryItem = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{
    item: InventoryWithRelations;
    movements: InventoryMovementRecord[];
    costLayers: (typeof inventoryCostLayers.$inferSelect)[];
  }> => {
    const ctx = await withAuth();

    // Get inventory item
    const [item] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.id, data.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      throw new NotFoundError("Inventory item not found", "inventory");
    }

    // Get related data in parallel
    const [product, location, movements, costLayers] = await Promise.all([
      // Product
      db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1)
        .then((r) => r[0] || null),
      // Location
      db
        .select()
        .from(warehouseLocations)
        .where(eq(warehouseLocations.id, item.locationId))
        .limit(1)
        .then((r) => r[0] || null),
      // Recent movements
      db
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryId, data.id))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(50),
      // Cost layers
      db
        .select()
        .from(inventoryCostLayers)
        .where(eq(inventoryCostLayers.inventoryId, data.id))
        .orderBy(asc(inventoryCostLayers.receivedAt)),
    ]);

    return {
      item: {
        ...item,
        product,
        location,
      },
      movements,
      costLayers,
    };
  });

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================

/**
 * Adjust inventory quantity with full audit trail.
 */
export const adjustInventory = createServerFn({ method: "POST" })
  .inputValidator(stockAdjustmentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });

    // Find or create inventory record
    let [inventoryRecord] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.organizationId, ctx.organizationId),
          eq(inventory.productId, data.productId),
          eq(inventory.locationId, data.locationId)
        )
      )
      .limit(1);

    const previousQuantity = inventoryRecord?.quantityOnHand ?? 0;
    const newQuantity = previousQuantity + data.adjustmentQty;

    if (newQuantity < 0) {
      // Check if location allows negative inventory
      const [loc] = await db
        .select()
        .from(warehouseLocations)
        .where(eq(warehouseLocations.id, data.locationId))
        .limit(1);

      const allowNegative = loc?.attributes?.allowNegative ?? false;
      if (!allowNegative) {
        throw new ValidationError("Adjustment would result in negative inventory", {
          adjustmentQty: ["Would result in negative inventory"],
        });
      }
    }

    // Begin transaction
    return await db.transaction(async (tx) => {
      if (!inventoryRecord) {
        // Create new inventory record
        // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
        [inventoryRecord] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: "available",
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
        // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
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
          movementType: "adjust",
          quantity: data.adjustmentQty,
          previousQuantity,
          newQuantity,
          unitCost: inventoryRecord.unitCost,
          totalCost: sql`${data.adjustmentQty} * COALESCE(${inventoryRecord.unitCost}, 0)`,
          referenceType: "adjustment",
          metadata: {
            reason: data.reason,
          },
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

      return {
        item: inventoryRecord,
        movement,
      };
    });
  });

/**
 * Transfer inventory between locations.
 */
export const transferInventory = createServerFn({ method: "POST" })
  .inputValidator(stockTransferSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });

    if (data.fromLocationId === data.toLocationId) {
      throw new ValidationError("Cannot transfer to the same location", {
        toLocationId: ["Cannot be the same as source location"],
      });
    }

    // Find source inventory
    const [sourceInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.organizationId, ctx.organizationId),
          eq(inventory.productId, data.productId),
          eq(inventory.locationId, data.fromLocationId)
        )
      )
      .limit(1);

    if (!sourceInventory) {
      throw new NotFoundError("Source inventory not found", "inventory");
    }

    if ((sourceInventory.quantityAvailable ?? 0) < data.quantity) {
      throw new ValidationError("Insufficient available quantity for transfer", {
        quantity: [
          `Only ${sourceInventory.quantityAvailable} available`,
        ],
      });
    }

    // Begin transaction
    return await db.transaction(async (tx) => {
      // Deduct from source
      // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
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
        movementType: "transfer",
        quantity: -data.quantity,
        previousQuantity: sourceInventory.quantityOnHand ?? 0,
        newQuantity: newSourceQty,
        unitCost: sourceInventory.unitCost,
        totalCost: sql`${-data.quantity} * COALESCE(${sourceInventory.unitCost}, 0)`,
        referenceType: "transfer",
        notes: data.notes,
        createdBy: ctx.user.id,
      });

      // Find or create destination inventory
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
        .limit(1);

      const destPrevQty = destInventory?.quantityOnHand ?? 0;
      const destNewQty = destPrevQty + data.quantity;

      if (!destInventory) {
        // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
        [destInventory] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.toLocationId,
            status: "available",
            quantityOnHand: destNewQty,
            quantityAllocated: 0,
            unitCost: sourceInventory.unitCost,
            totalValue: sql`${destNewQty} * COALESCE(${sourceInventory.unitCost}, 0)`,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();
      } else {
        // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
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
          movementType: "transfer",
          quantity: data.quantity,
          previousQuantity: destPrevQty,
          newQuantity: destNewQty,
          unitCost: sourceInventory.unitCost,
          totalCost: sql`${data.quantity} * COALESCE(${sourceInventory.unitCost}, 0)`,
          referenceType: "transfer",
          notes: data.notes,
          createdBy: ctx.user.id,
        })
        .returning();

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
 */
export const allocateInventory = createServerFn({ method: "POST" })
  .inputValidator(allocateInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.allocate });

    // Get inventory item
    const [item] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.id, data.inventoryId),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      throw new NotFoundError("Inventory item not found", "inventory");
    }

    if ((item.quantityAvailable ?? 0) < data.quantity) {
      throw new ValidationError("Insufficient available quantity", {
        quantity: [`Only ${item.quantityAvailable} available for allocation`],
      });
    }

    return await db.transaction(async (tx) => {
      const newAllocated = (item.quantityAllocated ?? 0) + data.quantity;
      const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

      // Update inventory
      // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
      const [updatedItem] = await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          status: newAvailable <= 0 ? "allocated" : "available",
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
          movementType: "allocate",
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

      return {
        item: updatedItem,
        movement,
      };
    });
  });

/**
 * Deallocate inventory (release reservation).
 */
export const deallocateInventory = createServerFn({ method: "POST" })
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

    // Get inventory item
    const [item] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.id, data.inventoryId),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      throw new NotFoundError("Inventory item not found", "inventory");
    }

    if ((item.quantityAllocated ?? 0) < data.quantity) {
      throw new ValidationError("Cannot deallocate more than allocated", {
        quantity: [`Only ${item.quantityAllocated} currently allocated`],
      });
    }

    return await db.transaction(async (tx) => {
      const newAllocated = (item.quantityAllocated ?? 0) - data.quantity;
      const newAvailable = (item.quantityOnHand ?? 0) - newAllocated;

      // Update inventory
      // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
      const [updatedItem] = await tx
        .update(inventory)
        .set({
          quantityAllocated: newAllocated,
          status: newAllocated > 0 ? "allocated" : "available",
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
          movementType: "deallocate",
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
export const receiveInventory = createServerFn({ method: "POST" })
  .inputValidator(receiveInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });

    // Validate product exists
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError("Product not found", "product");
    }

    // Validate location exists
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
      throw new NotFoundError("Location not found", "location");
    }

    return await db.transaction(async (tx) => {
      // Find existing inventory record or create new
      let [inventoryRecord] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.organizationId, ctx.organizationId),
            eq(inventory.productId, data.productId),
            eq(inventory.locationId, data.locationId),
            data.lotNumber
              ? eq(inventory.lotNumber, data.lotNumber)
              : isNull(inventory.lotNumber)
          )
        )
        .limit(1);

      const prevQuantity = inventoryRecord?.quantityOnHand ?? 0;
      const newQuantity = prevQuantity + data.quantity;

      // Calculate weighted average cost
      const prevTotalCost = (inventoryRecord?.totalValue ?? 0);
      const newTotalCost = prevTotalCost + data.quantity * data.unitCost;
      const newUnitCost = newQuantity > 0 ? newTotalCost / newQuantity : data.unitCost;

      // Note: quantityAvailable is a generated column (quantityOnHand - quantityAllocated)
      if (!inventoryRecord) {
        [inventoryRecord] = await tx
          .insert(inventory)
          .values({
            organizationId: ctx.organizationId,
            productId: data.productId,
            locationId: data.locationId,
            status: "available",
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
          movementType: "receive",
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
          referenceType: data.referenceType as "purchase_order" | "adjustment" | "transfer" | undefined,
          referenceId: data.referenceId,
          expiryDate: data.expiryDate,
        })
        .returning();

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
export const listMovements = createServerFn({ method: "GET" })
  .inputValidator(movementListQuerySchema)
  .handler(async ({ data }): Promise<ListMovementsResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 50, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [eq(inventoryMovements.organizationId, ctx.organizationId)];

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
    const offset = (page - 1) * limit;
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(and(...conditions))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      movements,
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
export const getInventoryDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const ctx = await withAuth();

    // Get inventory metrics
    const [metrics] = await db
      .select({
        totalItems: sql<number>`COUNT(*)::int`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        locationsCount: sql<number>`COUNT(DISTINCT ${inventory.locationId})::int`,
        lowStockCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.quantityAvailable} < 10)::int`,
        outOfStockCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.quantityAvailable} <= 0)::int`,
        allocatedCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.quantityAllocated} > 0)::int`,
      })
      .from(inventory)
      .where(eq(inventory.organizationId, ctx.organizationId));

    // Get recent movements
    const recentMovements = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.organizationId, ctx.organizationId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(10);

    // Get top moving products (by movement count)
    const topMoving = await db
      .select({
        productId: inventoryMovements.productId,
        movementCount: sql<number>`COUNT(*)::int`,
        totalQuantity: sql<number>`SUM(ABS(${inventoryMovements.quantity}))::int`,
      })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.organizationId, ctx.organizationId),
          gte(inventoryMovements.createdAt, sql`NOW() - INTERVAL '30 days'`)
        )
      )
      .groupBy(inventoryMovements.productId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    return {
      metrics: {
        totalItems: metrics?.totalItems ?? 0,
        totalValue: Number(metrics?.totalValue ?? 0),
        locationsCount: metrics?.locationsCount ?? 0,
        lowStockCount: metrics?.lowStockCount ?? 0,
        outOfStockCount: metrics?.outOfStockCount ?? 0,
        allocatedCount: metrics?.allocatedCount ?? 0,
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

/**
 * Bulk update inventory status.
 */
export const bulkUpdateStatus = createServerFn({ method: "POST" })
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

      // Create movement records for each item
      for (const item of updated) {
        await tx.insert(inventoryMovements).values({
          organizationId: ctx.organizationId,
          inventoryId: item.id,
          productId: item.productId,
          locationId: item.locationId,
          movementType: "adjust",
          quantity: 0, // Status change, not quantity change
          previousQuantity: item.quantityOnHand ?? 0,
          newQuantity: item.quantityOnHand ?? 0,
          metadata: {
            reason: data.reason,
            statusChange: data.status,
          },
          createdBy: ctx.user.id,
        });
      }

      return {
        updatedCount: updated.length,
        items: updated,
      };
    });
  });

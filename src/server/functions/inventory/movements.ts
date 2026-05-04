/**
 * Inventory movement server functions.
 *
 * Owns movement-history reads for operator timelines, item detail history, and
 * dashboard movement panels.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { movementListQuerySchema, type ListMovementsResult } from '@/lib/schemas/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import {
  inventoryMovements,
  orders,
  products,
  purchaseOrders,
  warehouseLocations as locations,
} from 'drizzle/schema';

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

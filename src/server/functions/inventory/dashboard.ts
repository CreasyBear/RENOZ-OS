/**
 * Inventory dashboard server functions.
 *
 * Owns the standard inventory dashboard summary used by inventory overview
 * hooks. WMS-specific aggregate reads remain separate.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import {
  inventory,
  inventoryMovements,
  products,
  purchaseOrders,
} from 'drizzle/schema';

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

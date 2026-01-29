/**
 * Inventory Valuation Server Functions
 *
 * FIFO cost layer tracking, inventory valuation, and COGS calculations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  inventory,
  inventoryCostLayers,
  products,
  warehouseLocations as locations,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { formatAmount } from '@/lib/currency';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  costLayerFilterSchema,
  createCostLayerSchema,
  inventoryValuationQuerySchema,
  cogsCalculationSchema,
  inventoryAgingQuerySchema,
  inventoryTurnoverQuerySchema,
} from '@/lib/schemas/inventory';

// ============================================================================
// TYPES
// ============================================================================

type CostLayerRecord = typeof inventoryCostLayers.$inferSelect;

interface LocationValuation {
  locationId: string;
  locationCode: string;
  locationName: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
}

interface ProductValuation {
  productId: string;
  productSku: string;
  productName: string;
  totalQuantity: number;
  weightedAverageCost: number;
  totalValue: number;
  costLayers: number;
}

interface InventoryValuationResult {
  totalValue: number;
  totalSkus: number;
  byLocation: LocationValuation[];
  byProduct: ProductValuation[];
  valuationMethod: string;
  asOf: string;
}

interface COGSResult {
  cogs: number;
  costLayers: CostLayerRecord[];
  remainingLayers: CostLayerRecord[];
}

// ============================================================================
// COST LAYERS
// ============================================================================

/**
 * List cost layers with filtering.
 */
export const listCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(
    costLayerFilterSchema.extend({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { page, pageSize, ...filters } = data;
    const limit = pageSize;

    const conditions = [eq(inventoryCostLayers.organizationId, ctx.organizationId)];

    if (filters.inventoryId) {
      conditions.push(eq(inventoryCostLayers.inventoryId, filters.inventoryId));
    }
    if (filters.hasRemaining) {
      conditions.push(gt(inventoryCostLayers.quantityRemaining, 0));
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryCostLayers)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    const offset = (page - 1) * limit;
    const layers = await db
      .select()
      .from(inventoryCostLayers)
      .where(and(...conditions))
      .orderBy(asc(inventoryCostLayers.receivedAt))
      .limit(limit)
      .offset(offset);

    return {
      layers,
      total,
      page,
      limit,
      hasMore: offset + layers.length < total,
    };
  });

/**
 * Get cost layers for a specific inventory item.
 */
export const getInventoryCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ inventoryId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Verify inventory exists and belongs to org
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!inv) {
      throw new NotFoundError('Inventory item not found', 'inventory');
    }

    const layers = await db
      .select()
      .from(inventoryCostLayers)
      .where(eq(inventoryCostLayers.inventoryId, data.inventoryId))
      .orderBy(asc(inventoryCostLayers.receivedAt));

    // Calculate summary
    const activeLayers = layers.filter((l) => l.quantityRemaining > 0);
    const totalRemaining = activeLayers.reduce((sum, l) => sum + l.quantityRemaining, 0);
    const totalValue = activeLayers.reduce(
      (sum, l) => sum + l.quantityRemaining * Number(l.unitCost),
      0
    );
    const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

    return {
      layers,
      summary: {
        totalLayers: layers.length,
        activeLayers: activeLayers.length,
        depletedLayers: layers.length - activeLayers.length,
        totalRemaining,
        totalValue,
        weightedAverageCost: weightedAvgCost,
        oldestLayerDate: layers[0]?.receivedAt ?? null,
        newestLayerDate: layers[layers.length - 1]?.receivedAt ?? null,
      },
    };
  });

/**
 * Create a cost layer manually (for adjustments).
 */
export const createCostLayer = createServerFn({ method: 'POST' })
  .inputValidator(createCostLayerSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    // Verify inventory exists
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!inv) {
      throw new NotFoundError('Inventory item not found', 'inventory');
    }

    const [layer] = await db
      .insert(inventoryCostLayers)
      .values({
        organizationId: ctx.organizationId,
        inventoryId: data.inventoryId,
        receivedAt: data.receivedAt,
        quantityReceived: data.quantityReceived,
        quantityRemaining: data.quantityRemaining,
        unitCost: String(data.unitCost),
        ...(data.referenceType !== undefined && { referenceType: data.referenceType }),
        ...(data.referenceId !== undefined && { referenceId: data.referenceId }),
        ...(data.expiryDate !== undefined && { expiryDate: String(data.expiryDate) }),
      })
      .returning();

    return { layer };
  });

// ============================================================================
// INVENTORY VALUATION
// ============================================================================

/**
 * Get total inventory valuation.
 */
export const getInventoryValuation = createServerFn({ method: 'GET' })
  .inputValidator(inventoryValuationQuerySchema)
  .handler(async ({ data }): Promise<InventoryValuationResult> => {
    const ctx = await withAuth();

    const invConditions = [eq(inventory.organizationId, ctx.organizationId)];

    if (data.locationId) {
      invConditions.push(eq(inventory.locationId, data.locationId));
    }
    if (data.productId) {
      invConditions.push(eq(inventory.productId, data.productId));
    }

    // Get total value
    const [totals] = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalSkus: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
      })
      .from(inventory)
      .where(and(...invConditions));

    // Get by location
    const byLocation = await db
      .select({
        locationId: locations.id,
        locationCode: locations.locationCode,
        locationName: locations.name,
        itemCount: sql<number>`COUNT(DISTINCT ${inventory.id})::int`,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
      })
      .from(inventory)
      .innerJoin(locations, eq(inventory.locationId, locations.id))
      .where(and(...invConditions))
      .groupBy(locations.id, locations.locationCode, locations.name)
      .orderBy(desc(sql`SUM(${inventory.totalValue})`));

    // Get by product
    const byProduct = await db
      .select({
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        weightedAverageCost: sql<number>`
          CASE
            WHEN SUM(${inventory.quantityOnHand}) > 0
            THEN SUM(${inventory.totalValue}) / SUM(${inventory.quantityOnHand})
            ELSE 0
          END::numeric`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        costLayers: sql<number>`(
          SELECT COUNT(*)
          FROM inventory_cost_layers cl
          INNER JOIN inventory inv2 ON cl.inventory_id = inv2.id
          WHERE inv2.product_id = ${products.id}
            AND inv2.organization_id = ${ctx.organizationId}
            AND cl.quantity_remaining > 0
            ${data.locationId ? sql`AND inv2.location_id = ${data.locationId}` : sql``}
        )::int`,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(and(...invConditions))
      .groupBy(products.id, products.sku, products.name)
      .orderBy(desc(sql`SUM(${inventory.totalValue})`))
      .limit(50);

    return {
      totalValue: Number(totals?.totalValue ?? 0),
      totalSkus: totals?.totalSkus ?? 0,
      byLocation: byLocation.map((l) => ({
        ...l,
        totalValue: Number(l.totalValue),
      })),
      byProduct: byProduct.map((p) => ({
        ...p,
        weightedAverageCost: Number(p.weightedAverageCost),
        totalValue: Number(p.totalValue),
      })),
      valuationMethod: data.valuationMethod,
      asOf: new Date().toISOString(),
    };
  });

/**
 * Calculate cost of goods sold using FIFO.
 */
export const calculateCOGS = createServerFn({ method: 'GET' })
  .inputValidator(cogsCalculationSchema)
  .handler(async ({ data }): Promise<COGSResult> => {
    const ctx = await withAuth();

    // Verify inventory exists
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!inv) {
      throw new NotFoundError('Inventory item not found', 'inventory');
    }

    // Get active cost layers in FIFO order
    const layers = await db
      .select()
      .from(inventoryCostLayers)
      .where(
        and(
          eq(inventoryCostLayers.inventoryId, data.inventoryId),
          gt(inventoryCostLayers.quantityRemaining, 0)
        )
      )
      .orderBy(asc(inventoryCostLayers.receivedAt));

    // Check if enough quantity
    const totalAvailable = layers.reduce((sum, l) => sum + l.quantityRemaining, 0);
    if (totalAvailable < data.quantity) {
      throw new ValidationError('Insufficient inventory for COGS calculation', {
        quantity: [`Only ${totalAvailable} available in cost layers`],
      });
    }

    // Calculate COGS using FIFO
    let remainingQuantity = data.quantity;
    let totalCOGS = 0;
    const usedLayers: CostLayerRecord[] = [];
    const updatedLayers: CostLayerRecord[] = [];

    for (const layer of layers) {
      if (remainingQuantity <= 0) break;

      const quantityFromLayer = Math.min(remainingQuantity, layer.quantityRemaining);
      const layerCost = quantityFromLayer * Number(layer.unitCost);

      totalCOGS += layerCost;
      remainingQuantity -= quantityFromLayer;

      usedLayers.push({
        ...layer,
        // Show how much would be taken from this layer
        quantityRemaining: quantityFromLayer,
      });

      // Calculate what would remain
      const newRemaining = layer.quantityRemaining - quantityFromLayer;
      updatedLayers.push({
        ...layer,
        quantityRemaining: newRemaining,
      });
    }

    // If not simulating, actually update the layers
    if (!data.simulate) {
      await db.transaction(async (tx) => {
        for (let i = 0; i < usedLayers.length; i++) {
          const layer = layers[i];
          const quantityUsed = usedLayers[i].quantityRemaining;
          const newRemaining = layer.quantityRemaining - quantityUsed;

          await tx
            .update(inventoryCostLayers)
            .set({ quantityRemaining: newRemaining })
            .where(eq(inventoryCostLayers.id, layer.id));
        }
      });
    }

    return {
      cogs: totalCOGS,
      costLayers: usedLayers,
      remainingLayers: updatedLayers.filter((l) => l.quantityRemaining > 0),
    };
  });

// ============================================================================
// AGING ANALYSIS
// ============================================================================

/**
 * Get inventory aging analysis.
 */
export const getInventoryAging = createServerFn({ method: 'GET' })
  .inputValidator(inventoryAgingQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [eq(inventoryCostLayers.organizationId, ctx.organizationId)];

    // Build age bucket CASE expression
    const buckets = data.ageBuckets.sort((a, b) => a - b);
    const bucketLabels = [
      `0-${buckets[0]} days`,
      ...buckets.slice(0, -1).map((b, i) => `${b + 1}-${buckets[i + 1]} days`),
      `>${buckets[buckets.length - 1]} days`,
    ];

    // Get aging data with cost layers
    const aging = await db
      .select({
        inventoryId: inventoryCostLayers.inventoryId,
        productId: inventory.productId,
        productSku: products.sku,
        productName: products.name,
        layerId: inventoryCostLayers.id,
        receivedAt: inventoryCostLayers.receivedAt,
        quantityRemaining: inventoryCostLayers.quantityRemaining,
        unitCost: inventoryCostLayers.unitCost,
        ageInDays: sql<number>`EXTRACT(DAY FROM NOW() - ${inventoryCostLayers.receivedAt})::int`,
      })
      .from(inventoryCostLayers)
      .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(
        and(
          ...conditions,
          gt(inventoryCostLayers.quantityRemaining, 0),
          data.locationId ? eq(inventory.locationId, data.locationId) : sql`true`
        )
      )
      .orderBy(asc(inventoryCostLayers.receivedAt));

    // Group by age bucket
    const bucketData = bucketLabels.map((label, index) => {
      const minDays = index === 0 ? 0 : buckets[index - 1] + 1;
      const maxDays = index < buckets.length ? buckets[index] : Infinity;

      const itemsInBucket = aging.filter(
        (item) => item.ageInDays >= minDays && item.ageInDays <= maxDays
      );

      const totalQuantity = itemsInBucket.reduce((sum, item) => sum + item.quantityRemaining, 0);
      const totalValue = itemsInBucket.reduce(
        (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
        0
      );

      return {
        bucket: label,
        minDays,
        maxDays: maxDays === Infinity ? null : maxDays,
        itemCount: itemsInBucket.length,
        totalQuantity,
        totalValue,
        items: itemsInBucket.slice(0, 10), // Top 10 items per bucket
      };
    });

    // Summary
    const totalQuantity = aging.reduce((sum, item) => sum + item.quantityRemaining, 0);
    const totalValue = aging.reduce(
      (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
      0
    );
    const avgAge =
      aging.length > 0
        ? aging.reduce((sum, item) => sum + item.ageInDays * item.quantityRemaining, 0) /
          totalQuantity
        : 0;

    return {
      aging: bucketData,
      summary: {
        totalItems: aging.length,
        totalQuantity,
        totalValue,
        averageAge: Math.round(avgAge),
        oldestItem: aging.length > 0 ? aging[0] : null,
      },
      recommendations: generateAgingRecommendations(bucketData),
    };
  });

function generateAgingRecommendations(
  bucketData: Array<{ bucket: string; totalValue: number; totalQuantity: number }>
) {
  const recommendations: Array<{ type: string; message: string; priority: string }> = [];

  // Check for old inventory
  const oldBuckets = bucketData.filter((b) => b.bucket.includes('>') || b.bucket.includes('365'));
  const oldValue = oldBuckets.reduce((sum, b) => sum + b.totalValue, 0);

  if (oldValue > 0) {
    recommendations.push({
      type: 'slow_moving',
      message: `${formatAmount({ currency: 'AUD', amount: oldValue })} in inventory over 1 year old - consider markdown or disposal`,
      priority: 'high',
    });
  }

  // Check for concentration
  const totalValue = bucketData.reduce((sum, b) => sum + b.totalValue, 0);
  const newestBucket = bucketData[0];
  if (newestBucket && totalValue > 0) {
    const newestPercent = (newestBucket.totalValue / totalValue) * 100;
    if (newestPercent < 30) {
      recommendations.push({
        type: 'turn_rate',
        message: `Only ${newestPercent.toFixed(0)}% of inventory is recent - review purchasing patterns`,
        priority: 'medium',
      });
    }
  }

  return recommendations;
}

// ============================================================================
// TURNOVER ANALYSIS
// ============================================================================

/**
 * Get inventory turnover metrics.
 */
export const getInventoryTurnover = createServerFn({ method: 'GET' })
  .inputValidator(inventoryTurnoverQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const periodDays = data.period === '30d' ? 30 : data.period === '90d' ? 90 : 365;

    const conditions = [eq(inventory.organizationId, ctx.organizationId)];
    if (data.productId) {
      conditions.push(eq(inventory.productId, data.productId));
    }

    // Get current inventory value
    const [currentInventory] = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      })
      .from(inventory)
      .where(and(...conditions));

    // Get COGS for period (sum of outbound movements * cost)
    const [cogsPeriod] = await db.execute<{ cogs: number }>(
      sql`
        SELECT COALESCE(SUM(ABS(total_cost)), 0)::numeric as cogs
        FROM inventory_movements
        WHERE organization_id = ${ctx.organizationId}
          AND movement_type IN ('pick', 'ship', 'adjust')
          AND quantity < 0
          AND created_at >= NOW() - INTERVAL '${sql.raw(String(periodDays))} days'
          ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
      `
    );

    const cogs = Number((cogsPeriod as unknown as { cogs: number }[])[0]?.cogs ?? 0);
    const avgInventory = Number(currentInventory?.totalValue ?? 0);

    // Calculate turnover rate
    const annualizedCOGS = (cogs / periodDays) * 365;
    const turnoverRate = avgInventory > 0 ? annualizedCOGS / avgInventory : 0;
    const daysOnHand = turnoverRate > 0 ? 365 / turnoverRate : 0;

    // Get turnover by product (top 20)
    const turnoverByProduct = await db.execute<{
      productId: string;
      productSku: string;
      productName: string;
      inventoryValue: number;
      periodCOGS: number;
      turnoverRate: number;
    }>(
      sql`
        WITH product_cogs AS (
          SELECT
            product_id,
            COALESCE(SUM(ABS(total_cost)), 0) as period_cogs
          FROM inventory_movements
          WHERE organization_id = ${ctx.organizationId}
            AND movement_type IN ('pick', 'ship', 'adjust')
            AND quantity < 0
            AND created_at >= NOW() - INTERVAL '${sql.raw(String(periodDays))} days'
          GROUP BY product_id
        ),
        product_inventory AS (
          SELECT
            product_id,
            COALESCE(SUM(total_value), 0) as inventory_value
          FROM inventory
          WHERE organization_id = ${ctx.organizationId}
          GROUP BY product_id
        )
        SELECT
          p.id as product_id,
          p.sku as product_sku,
          p.name as product_name,
          COALESCE(pi.inventory_value, 0)::numeric as inventory_value,
          COALESCE(pc.period_cogs, 0)::numeric as period_cogs,
          CASE
            WHEN COALESCE(pi.inventory_value, 0) > 0
            THEN ((COALESCE(pc.period_cogs, 0) / ${periodDays}) * 365) / pi.inventory_value
            ELSE 0
          END::numeric as turnover_rate
        FROM products p
        LEFT JOIN product_inventory pi ON p.id = pi.product_id
        LEFT JOIN product_cogs pc ON p.id = pc.product_id
        WHERE p.organization_id = ${ctx.organizationId}
          AND (pi.inventory_value > 0 OR pc.period_cogs > 0)
        ORDER BY turnover_rate DESC
        LIMIT 20
      `
    );

    return {
      turnover: {
        period: data.period,
        periodDays,
        cogsForPeriod: cogs,
        averageInventoryValue: avgInventory,
        annualizedCOGS,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        daysOnHand: Math.round(daysOnHand),
      },
      byProduct: (
        turnoverByProduct as unknown as Array<{
          productId: string;
          productSku: string;
          productName: string;
          inventoryValue: number;
          periodCOGS: number;
          turnoverRate: number;
        }>
      ).map((p) => ({
        ...p,
        inventoryValue: Number(p.inventoryValue),
        periodCOGS: Number(p.periodCOGS),
        turnoverRate: Number(p.turnoverRate),
      })),
      benchmarks: {
        excellent: 12, // 12+ turns per year
        good: 6, // 6-12 turns
        average: 3, // 3-6 turns
        poor: 1, // <3 turns
      },
    };
  });

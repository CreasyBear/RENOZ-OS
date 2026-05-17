/**
 * Inventory Valuation Server Functions
 *
 * FIFO cost layer tracking, inventory valuation, and COGS calculations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, gt, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  inventory,
  inventoryCostLayers,
  products,
  categories,
  warehouseLocations as locations,
} from 'drizzle/schema';
import { inventoryCostLayerCapitalizations } from 'drizzle/schema/inventory/inventory';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  costLayerFilterSchema,
  createCostLayerSchema,
  inventoryValuationQuerySchema,
  cogsCalculationSchema,
  inventoryAgingQuerySchema,
  inventoryTurnoverQuerySchema,
  inventoryFinanceIntegrityQuerySchema,
  inventoryFinanceReconcileSchema,
  type InventoryValuationResult,
  type InventoryTurnoverResult,
  type COGSResult,
  type InventoryFinanceIntegritySummary,
  type InventoryFinanceReconcileResult,
  type InventoryCostLayerRow,
  type InventoryCostLayerCostComponent,
} from '@/lib/schemas/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';
import { recomputeInventoryValueFromLayers } from '@/server/functions/_shared/inventory-finance';
import { getFinanceIntegritySummary } from './finance-integrity-summary';
import { readInventoryAging } from './inventory-aging-read';
import { readInventoryTurnover } from './inventory-turnover-read';
import { readProductCostLayers } from './product-cost-layers-read';

// ============================================================================
// TYPES
// ============================================================================

type CostLayerRecord = typeof inventoryCostLayers.$inferSelect;

function valuationInventoryProductJoinCondition(organizationId: string) {
  return and(
    eq(inventory.productId, products.id),
    eq(products.organizationId, organizationId),
    isNull(products.deletedAt)
  );
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Convert decimal string to number for API response.
 * Drizzle returns decimal columns as strings, but schema expects numbers.
 */
function parseDecimal(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

function toInventoryCostLayerRow(
  layer: typeof inventoryCostLayers.$inferSelect,
  costComponents: InventoryCostLayerCostComponent[]
): InventoryCostLayerRow {
  const expiryDate = layer.expiryDate
    ? typeof layer.expiryDate === 'string'
      ? new Date(layer.expiryDate)
      : layer.expiryDate
    : null;
  return {
    id: layer.id,
    receivedAt: layer.receivedAt,
    quantityReceived: layer.quantityReceived,
    quantityRemaining: layer.quantityRemaining,
    unitCost: layer.unitCost,
    referenceType: layer.referenceType,
    referenceId: layer.referenceId,
    expiryDate,
    costComponents,
  };
}

async function attachCostLayerCapitalizations(
  organizationId: string,
  layers: Array<typeof inventoryCostLayers.$inferSelect>
): Promise<InventoryCostLayerRow[]> {
  if (layers.length === 0) return [];
  const layerIds = layers.map((layer) => layer.id);
  const components = await db
    .select()
    .from(inventoryCostLayerCapitalizations)
    .where(
      and(
        eq(inventoryCostLayerCapitalizations.organizationId, organizationId),
        inArray(inventoryCostLayerCapitalizations.inventoryCostLayerId, layerIds)
      )
    );
  const byLayerId = new Map<string, typeof components>();
  for (const component of components) {
    const existing = byLayerId.get(component.inventoryCostLayerId) ?? [];
    existing.push(component);
    byLayerId.set(component.inventoryCostLayerId, existing);
  }

  return layers.map((layer) => {
    const rawComponents = byLayerId.get(layer.id) ?? [];
    const costComponents: InventoryCostLayerCostComponent[] = rawComponents.map((c) => ({
      id: c.id,
      componentType:
        c.componentType === 'allocated_additional_cost' ? 'allocated_additional_cost' : 'base_unit_cost',
      costType: c.costType,
      quantityBasis: c.quantityBasis,
      amountTotal: Number(c.amountTotal),
      amountPerUnit: Number(c.amountPerUnit),
      currency: c.currency,
      exchangeRate: c.exchangeRate == null ? null : Number(c.exchangeRate),
      metadata: (c.metadata ?? null) as FlexibleJson | null,
    }));
    return toInventoryCostLayerRow(layer, costComponents);
  });
}

// ============================================================================
// COST LAYERS
// ============================================================================

/**
 * List cost layers with filtering.
 */
export const listCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(
    normalizeObjectInput(
      costLayerFilterSchema.extend({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      })
    )
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
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
    const layersWithComponents = await attachCostLayerCapitalizations(ctx.organizationId, layers);

    return {
      layers: layersWithComponents,
      total,
      page,
      limit,
      hasMore: offset + layersWithComponents.length < total,
    };
  });

/**
 * Get cost layers for a specific inventory item.
 */
export const getInventoryCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ inventoryId: z.string().uuid() })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

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

    // OPTIMIZED: Add organizationId filter for security and to use index
    const layers = await db
      .select()
      .from(inventoryCostLayers)
      .where(
        and(
          eq(inventoryCostLayers.organizationId, ctx.organizationId),
          eq(inventoryCostLayers.inventoryId, data.inventoryId)
        )
      )
      .orderBy(asc(inventoryCostLayers.receivedAt));
    const layersWithComponents = await attachCostLayerCapitalizations(ctx.organizationId, layers);

    // Calculate summary
    const activeLayers = layersWithComponents.filter((l) => l.quantityRemaining > 0);
    const totalRemaining = activeLayers.reduce((sum, l) => sum + l.quantityRemaining, 0);
    const totalValue = activeLayers.reduce(
      (sum, l) => sum + l.quantityRemaining * Number(l.unitCost),
      0
    );
    const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

    return {
      layers: layersWithComponents,
      summary: {
        totalLayers: layersWithComponents.length,
        activeLayers: activeLayers.length,
        depletedLayers: layersWithComponents.length - activeLayers.length,
        totalRemaining,
        totalValue,
        weightedAverageCost: weightedAvgCost,
        oldestLayerDate: layersWithComponents[0]?.receivedAt ?? null,
        newestLayerDate: layersWithComponents[layersWithComponents.length - 1]?.receivedAt ?? null,
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

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      // Lock the inventory row so the layer insert and derived value cache stay coherent.
      const [inv] = await tx
        .select({ id: inventory.id })
        .from(inventory)
        .where(
          and(eq(inventory.id, data.inventoryId), eq(inventory.organizationId, ctx.organizationId))
        )
        .for('update')
        .limit(1);

      if (!inv) {
        throw new NotFoundError('Inventory item not found', 'inventory');
      }

      const [layer] = await tx
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

      await recomputeInventoryValueFromLayers(tx, {
        organizationId: ctx.organizationId,
        inventoryId: data.inventoryId,
        userId: ctx.user.id,
      });

      return { layer };
    });
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
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const invConditions = [eq(inventory.organizationId, ctx.organizationId)];

    if (data.locationId) {
      invConditions.push(eq(inventory.locationId, data.locationId));
    }
    if (data.productId) {
      invConditions.push(eq(inventory.productId, data.productId));
    }

    // Get total value and units
    const [totals] = await db
      .select({
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalSkus: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
        totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::numeric`,
      })
      .from(inventory)
      .where(and(...invConditions));

    // Get by category
    const byCategory = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        totalUnits: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::numeric`,
        skuCount: sql<number>`COUNT(DISTINCT ${inventory.productId})::int`,
      })
      .from(inventory)
      .leftJoin(products, valuationInventoryProductJoinCondition(ctx.organizationId))
      .leftJoin(
        categories,
        and(
          eq(products.categoryId, categories.id),
          eq(categories.organizationId, ctx.organizationId)
        )
      )
      .where(and(...invConditions))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(sql`SUM(${inventory.totalValue})`));

    // Get by location
    const byLocation = await db
      .select({
        locationId: locations.id,
        locationCode: locations.locationCode,
        locationName: locations.name,
        itemCount: sql<number>`COUNT(DISTINCT ${inventory.id})::int`,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        capacity: locations.capacity,
      })
      .from(inventory)
      .innerJoin(
        locations,
        and(
          eq(inventory.locationId, locations.id),
          eq(locations.organizationId, ctx.organizationId)
        )
      )
      .where(and(...invConditions))
      .groupBy(locations.id, locations.locationCode, locations.name, locations.capacity)
      .orderBy(desc(sql`SUM(${inventory.totalValue})`));

    // OPTIMIZED: Use LEFT JOIN with aggregation instead of correlated subquery
    // Create subquery for cost layer counts per product
    const costLayerCounts = db
      .select({
        productId: inventory.productId,
        costLayerCount: sql<number>`COUNT(DISTINCT ${inventoryCostLayers.id})::int`,
      })
      .from(inventoryCostLayers)
      .innerJoin(
        inventory,
        and(
          eq(inventoryCostLayers.inventoryId, inventory.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .where(
        and(
          eq(inventoryCostLayers.organizationId, ctx.organizationId),
          eq(inventory.organizationId, ctx.organizationId),
          gt(inventoryCostLayers.quantityRemaining, 0),
          data.locationId ? eq(inventory.locationId, data.locationId) : sql`true`
        )
      )
      .groupBy(inventory.productId)
      .as('cost_layer_counts');

    // Get by product
    const byProduct = await db
      .select({
        productId: inventory.productId,
        productSku: sql<string>`COALESCE(${products.sku}, '')`,
        productName: sql<string>`COALESCE(${products.name}, 'Unknown Product')`,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        weightedAverageCost: sql<number>`
          CASE
            WHEN SUM(${inventory.quantityOnHand}) > 0
            THEN SUM(${inventory.totalValue}) / SUM(${inventory.quantityOnHand})
            ELSE 0
          END::numeric`,
        totalValue: sql<number>`COALESCE(SUM(${inventory.totalValue}), 0)::numeric`,
        costLayers: sql<number>`COALESCE(${costLayerCounts.costLayerCount}, 0)::int`,
      })
      .from(inventory)
      .leftJoin(products, valuationInventoryProductJoinCondition(ctx.organizationId))
      .leftJoin(costLayerCounts, eq(costLayerCounts.productId, inventory.productId))
      .where(and(...invConditions))
      .groupBy(inventory.productId, products.sku, products.name, costLayerCounts.costLayerCount)
      .orderBy(desc(sql`SUM(${inventory.totalValue})`))
      .limit(50);

    const totalValueNum = Number(totals?.totalValue ?? 0);
    const totalUnitsNum = Number(totals?.totalUnits ?? 0);
    const averageUnitCost = totalUnitsNum > 0 ? totalValueNum / totalUnitsNum : 0;

    const financeIntegrity = await getFinanceIntegritySummary(ctx.organizationId);

    return {
      totalValue: totalValueNum,
      totalSkus: totals?.totalSkus ?? 0,
      totalUnits: totalUnitsNum,
      averageUnitCost,
      byCategory: byCategory.map((c) => {
        const catValue = Number(c.totalValue);
        const catUnits = Number(c.totalUnits);
        return {
          categoryId: c.categoryId ?? '',
          categoryName: c.categoryName ?? 'Uncategorized',
          totalValue: catValue,
          totalUnits: catUnits,
          percentOfTotal: totalValueNum > 0 ? (catValue / totalValueNum) * 100 : 0,
          skuCount: c.skuCount ?? 0,
        };
      }),
      byLocation: byLocation.map((l) => {
        const locValue = Number(l.totalValue);
        const locQuantity = Number(l.totalQuantity);
        const capacity = l.capacity ? Number(l.capacity) : null;
        return {
          locationId: l.locationId,
          locationCode: l.locationCode,
          locationName: l.locationName,
          itemCount: l.itemCount,
          totalQuantity: locQuantity,
          totalValue: locValue,
          percentOfTotal: totalValueNum > 0 ? (locValue / totalValueNum) * 100 : 0,
          utilization: capacity && capacity > 0 ? (locQuantity / capacity) * 100 : 0,
        };
      }),
      byProduct: byProduct.map((p) => ({
        ...p,
        weightedAverageCost: Number(p.weightedAverageCost),
        totalValue: Number(p.totalValue),
      })),
      valuationMethod: data.valuationMethod,
      asOf: new Date().toISOString(),
      financeIntegrity,
    };
  });

export const getInventoryFinanceIntegrity = createServerFn({ method: 'GET' })
  .inputValidator(inventoryFinanceIntegrityQuerySchema)
  .handler(async ({ data }): Promise<InventoryFinanceIntegritySummary> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return getFinanceIntegritySummary(ctx.organizationId, data);
  });

export const reconcileInventoryFinanceIntegrity = createServerFn({ method: 'POST' })
  .inputValidator(inventoryFinanceReconcileSchema)
  .handler(async ({ data }): Promise<InventoryFinanceReconcileResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );
      const scannedResult = await tx.execute<{ count: number }>(
        sql`
          SELECT COUNT(*)::int AS count
          FROM inventory i
          WHERE i.organization_id = ${ctx.organizationId}
        `
      );
      const scannedInventoryRows = Number((scannedResult as unknown as Array<{ count: number }>)[0]?.count ?? 0);

      const missingRowsResult = await tx.execute<{
        inventory_id: string;
        quantity_on_hand: number;
        unit_cost: number;
      }>(sql`
        WITH layer_totals AS (
          SELECT
            icl.inventory_id,
            COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS active_qty
          FROM inventory_cost_layers icl
          WHERE icl.organization_id = ${ctx.organizationId}
          GROUP BY icl.inventory_id
        )
        SELECT
          i.id AS inventory_id,
          COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
          COALESCE(i.unit_cost, 0)::numeric AS unit_cost
        FROM inventory i
        LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
        WHERE i.organization_id = ${ctx.organizationId}
          AND COALESCE(i.quantity_on_hand, 0) > 0
          AND COALESCE(lt.active_qty, 0) = 0
        LIMIT ${data.limit}
      `);
      const missingRows = missingRowsResult as unknown as Array<{
        inventory_id: string;
        quantity_on_hand: number;
        unit_cost: number;
      }>;

      let repairedMissingLayers = 0;
      if (!data.dryRun) {
        for (const row of missingRows) {
          const qty = Math.max(0, Math.floor(Number(row.quantity_on_hand ?? 0)));
          if (qty <= 0) continue;
          const unitCost = Number(row.unit_cost ?? 0);
          await tx.insert(inventoryCostLayers).values({
            organizationId: ctx.organizationId,
            inventoryId: row.inventory_id,
            receivedAt: new Date(),
            quantityReceived: qty,
            quantityRemaining: qty,
            unitCost: String(unitCost),
            referenceType: 'adjustment',
          });
          repairedMissingLayers += 1;
        }

        const clampedResult = await tx.execute<{ count: number }>(sql`
          WITH updated AS (
            UPDATE inventory_cost_layers
            SET quantity_remaining = GREATEST(LEAST(quantity_remaining, quantity_received), 0)
            WHERE organization_id = ${ctx.organizationId}
              AND (
                quantity_remaining < 0
                OR quantity_remaining > quantity_received
              )
            RETURNING id
          )
          SELECT COUNT(*)::int AS count FROM updated
        `);
        const clampedInvalidLayers = Number((clampedResult as unknown as Array<{ count: number }>)[0]?.count ?? 0);

        const driftUpdateResult = await tx.execute<{ count: number }>(sql`
          WITH layer_totals AS (
            SELECT
              icl.inventory_id,
              COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS layer_value,
              COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS layer_qty
            FROM inventory_cost_layers icl
            WHERE icl.organization_id = ${ctx.organizationId}
            GROUP BY icl.inventory_id
          ),
          updated AS (
            UPDATE inventory i
            SET
              total_value = COALESCE(lt.layer_value, 0),
              unit_cost = CASE
                WHEN COALESCE(lt.layer_qty, 0) > 0 THEN COALESCE(lt.layer_value, 0) / lt.layer_qty
                ELSE 0
              END,
              updated_at = NOW()
            FROM layer_totals lt
            WHERE i.id = lt.inventory_id
              AND i.organization_id = ${ctx.organizationId}
              AND ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0)) > 0.01
            RETURNING i.id
          )
          SELECT COUNT(*)::int AS count FROM updated
        `);
        const repairedValueDriftRows = Number(
          (driftUpdateResult as unknown as Array<{ count: number }>)[0]?.count ?? 0
        );

        const postIntegrity = await getFinanceIntegritySummary(ctx.organizationId);
        return {
          dryRun: data.dryRun,
          scannedInventoryRows,
          repairedMissingLayers,
          repairedValueDriftRows,
          clampedInvalidLayers,
          remainingMismatches: postIntegrity.inventoryValueMismatchCount,
          postIntegrity,
        };
      }

      const currentIntegrity = await getFinanceIntegritySummary(ctx.organizationId);
      return {
        dryRun: data.dryRun,
        scannedInventoryRows,
        repairedMissingLayers: missingRows.length,
        repairedValueDriftRows: currentIntegrity.inventoryValueMismatchCount,
        clampedInvalidLayers: currentIntegrity.negativeOrOverconsumedLayers,
        remainingMismatches: currentIntegrity.inventoryValueMismatchCount,
        postIntegrity: currentIntegrity,
      };
    });
  });

/**
 * Calculate cost of goods sold using FIFO.
 */
export const calculateCOGS = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(cogsCalculationSchema))
  .handler(async ({ data }): Promise<COGSResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    if (!data.simulate) {
      throw new ValidationError(
        'Manual COGS application is disabled. Use shipment and RMA workflows to post COGS.',
        {
          simulate: ['Set simulate=true for previews; workflow mutations apply canonical COGS.'],
        }
      );
    }

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
    // OPTIMIZED: Add organizationId filter for security and to use index
    const layers = await db
      .select()
      .from(inventoryCostLayers)
      .where(
        and(
          eq(inventoryCostLayers.organizationId, ctx.organizationId),
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

    // Convert unitCost from decimal (string) to number for API response
    return {
      cogs: totalCOGS,
      costLayers: usedLayers.map((layer) => ({
        ...layer,
        unitCost: parseDecimal(layer.unitCost),
      })),
      remainingLayers: updatedLayers
        .filter((l) => l.quantityRemaining > 0)
        .map((layer) => ({
          ...layer,
          unitCost: parseDecimal(layer.unitCost),
        })),
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
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return readInventoryAging({
      organizationId: ctx.organizationId,
      locationId: data.locationId,
      ageBuckets: data.ageBuckets,
    });
  });

// ============================================================================
// TURNOVER ANALYSIS
// ============================================================================

/**
 * Get inventory turnover metrics.
 */
export const getInventoryTurnover = createServerFn({ method: 'GET' })
  .inputValidator(inventoryTurnoverQuerySchema)
  .handler(async ({ data }): Promise<InventoryTurnoverResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return readInventoryTurnover({
      organizationId: ctx.organizationId,
      period: data.period,
      productId: data.productId,
    });
  });

// ============================================================================
// PRODUCT COST LAYERS
// ============================================================================

/**
 * Get all cost layers for a product (across all inventory records).
 * Used in product detail view to show FIFO cost breakdown.
 */
export const getProductCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ productId: z.string().uuid() })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return readProductCostLayers({
      organizationId: ctx.organizationId,
      productId: data.productId,
    });
  });

// ============================================================================
// WEIGHTED AVERAGE COST UPDATE
// ============================================================================

/**
 * Recalculate and update a product's costPrice from its active cost layers.
 * Called after goods receipt and after COGS consumption.
 */
export const updateProductWeightedAverageCost = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });

    const [product] = await db
      .select({ id: products.id })
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

    // Get all active cost layers for this product
    const layers = await db
      .select({
        quantityRemaining: inventoryCostLayers.quantityRemaining,
        unitCost: inventoryCostLayers.unitCost,
      })
      .from(inventoryCostLayers)
      .innerJoin(
        inventory,
        and(
          eq(inventoryCostLayers.inventoryId, inventory.id),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .where(
        and(
          eq(inventoryCostLayers.organizationId, ctx.organizationId),
          eq(inventory.productId, data.productId),
          eq(inventory.organizationId, ctx.organizationId),
          gt(inventoryCostLayers.quantityRemaining, 0)
        )
      );

    if (layers.length === 0) {
      return { productId: data.productId, costPrice: null, updated: false };
    }

    const totalRemaining = layers.reduce((sum, l) => sum + l.quantityRemaining, 0);
    const totalValue = layers.reduce(
      (sum, l) => sum + l.quantityRemaining * Number(l.unitCost),
      0
    );
    const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;

    await db
      .update(products)
      .set({ costPrice: weightedAvgCost })
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      );

    return { productId: data.productId, costPrice: weightedAvgCost, updated: true };
  });

/**
 * Inventory Valuation Server Functions
 *
 * FIFO cost layer tracking, inventory valuation, and COGS calculations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, desc, asc, gt, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
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
import { formatAmount } from '@/lib/currency';
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
  type AggregatedAgingItem,
  type COGSResult,
  type InventoryFinanceIntegritySummary,
  type InventoryFinanceReconcileResult,
  type InventoryCostLayerRow,
  type InventoryCostLayerCostComponent,
} from '@/lib/schemas/inventory';
import type { FlexibleJson } from '@/lib/schemas/_shared/patterns';

// ============================================================================
// TYPES
// ============================================================================

type CostLayerRecord = typeof inventoryCostLayers.$inferSelect;

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

async function getFinanceIntegritySummary(
  organizationId: string,
  options?: { valueDriftTolerance?: number; topDriftLimit?: number }
): Promise<InventoryFinanceIntegritySummary> {
  const valueDriftTolerance = options?.valueDriftTolerance ?? 0.01;
  const topDriftLimit = options?.topDriftLimit ?? 25;

  const aggregateResult = await db.execute<{
    stock_without_active_layers: number;
    inventory_value_mismatch_count: number;
    total_absolute_value_drift: number;
    negative_or_overconsumed_layers: number;
    duplicate_active_serialized_allocations: number;
    shipment_link_status_mismatch: number;
  }>(
    sql`
      WITH layer_totals AS (
        SELECT
          icl.inventory_id,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining ELSE 0 END), 0)::numeric AS active_qty,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS active_value
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
        GROUP BY icl.inventory_id
      ),
      inv AS (
        SELECT
          i.id,
          COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
          COALESCE(i.total_value, 0)::numeric AS inventory_value,
          COALESCE(lt.active_qty, 0)::numeric AS active_qty,
          COALESCE(lt.active_value, 0)::numeric AS active_value
        FROM inventory i
        LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
        WHERE i.organization_id = ${organizationId}
      ),
      serialized_dupes AS (
        SELECT COUNT(*)::int AS cnt
        FROM (
          SELECT serialized_item_id
          FROM order_line_serial_allocations
          WHERE organization_id = ${organizationId}
            AND is_active = true
            AND released_at IS NULL
          GROUP BY serialized_item_id
          HAVING COUNT(*) > 1
        ) t
      ),
      shipment_mismatch AS (
        SELECT COUNT(*)::int AS cnt
        FROM shipment_item_serials sis
        INNER JOIN serialized_items si ON si.id = sis.serialized_item_id
        WHERE sis.organization_id = ${organizationId}
          AND si.organization_id = ${organizationId}
          AND si.status NOT IN ('shipped', 'returned')
      ),
      layer_bounds AS (
        SELECT COUNT(*)::int AS cnt
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
          AND (
            icl.quantity_remaining < 0
            OR icl.quantity_remaining > icl.quantity_received
          )
      )
      SELECT
        COALESCE(SUM(
          CASE
            WHEN inv.quantity_on_hand > 0 AND inv.active_qty = 0 THEN 1
            ELSE 0
          END
        ), 0)::int AS stock_without_active_layers,
        COALESCE(SUM(
          CASE
            WHEN ABS(inv.inventory_value - inv.active_value) > ${valueDriftTolerance} THEN 1
            ELSE 0
          END
        ), 0)::int AS inventory_value_mismatch_count,
        COALESCE(SUM(ABS(inv.inventory_value - inv.active_value)), 0)::numeric AS total_absolute_value_drift,
        (SELECT cnt FROM layer_bounds) AS negative_or_overconsumed_layers,
        (SELECT cnt FROM serialized_dupes) AS duplicate_active_serialized_allocations,
        (SELECT cnt FROM shipment_mismatch) AS shipment_link_status_mismatch
      FROM inv
    `
  );

  const topDriftRowsResult = await db.execute<{
    inventory_id: string;
    product_id: string;
    product_sku: string;
    product_name: string;
    location_id: string;
    location_name: string;
    quantity_on_hand: number;
    inventory_value: number;
    layer_value: number;
    absolute_drift: number;
  }>(
    sql`
      WITH layer_totals AS (
        SELECT
          icl.inventory_id,
          COALESCE(SUM(CASE WHEN icl.quantity_remaining > 0 THEN icl.quantity_remaining * icl.unit_cost ELSE 0 END), 0)::numeric AS layer_value
        FROM inventory_cost_layers icl
        WHERE icl.organization_id = ${organizationId}
        GROUP BY icl.inventory_id
      )
      SELECT
        i.id AS inventory_id,
        i.product_id,
        COALESCE(p.sku, '') AS product_sku,
        COALESCE(p.name, 'Unknown Product') AS product_name,
        i.location_id,
        COALESCE(l.name, 'Unknown') AS location_name,
        COALESCE(i.quantity_on_hand, 0)::numeric AS quantity_on_hand,
        COALESCE(i.total_value, 0)::numeric AS inventory_value,
        COALESCE(lt.layer_value, 0)::numeric AS layer_value,
        ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0))::numeric AS absolute_drift
      FROM inventory i
      LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN warehouse_locations l ON l.id = i.location_id
      WHERE i.organization_id = ${organizationId}
        AND ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0)) > ${valueDriftTolerance}
      ORDER BY absolute_drift DESC
      LIMIT ${topDriftLimit}
    `
  );

  const aggregate = (
    aggregateResult as unknown as Array<{
      stock_without_active_layers: number;
      inventory_value_mismatch_count: number;
      total_absolute_value_drift: number;
      negative_or_overconsumed_layers: number;
      duplicate_active_serialized_allocations: number;
      shipment_link_status_mismatch: number;
    }>
  )[0];
  const topDriftRows = topDriftRowsResult as unknown as Array<{
    inventory_id: string;
    product_id: string;
    product_sku: string;
    product_name: string;
    location_id: string;
    location_name: string;
    quantity_on_hand: number;
    inventory_value: number;
    layer_value: number;
    absolute_drift: number;
  }>;

  const stockWithoutActiveLayers = Number(aggregate?.stock_without_active_layers ?? 0);
  const inventoryValueMismatchCount = Number(aggregate?.inventory_value_mismatch_count ?? 0);
  const totalAbsoluteValueDrift = Number(aggregate?.total_absolute_value_drift ?? 0);
  const negativeOrOverconsumedLayers = Number(aggregate?.negative_or_overconsumed_layers ?? 0);
  const duplicateActiveSerializedAllocations = Number(
    aggregate?.duplicate_active_serialized_allocations ?? 0
  );
  const shipmentLinkStatusMismatch = Number(aggregate?.shipment_link_status_mismatch ?? 0);

  const hardFailures = [
    stockWithoutActiveLayers,
    inventoryValueMismatchCount,
    negativeOrOverconsumedLayers,
    duplicateActiveSerializedAllocations,
    shipmentLinkStatusMismatch,
  ].some((v) => v > 0);
  const status: InventoryFinanceIntegritySummary['status'] = hardFailures
    ? 'red'
    : totalAbsoluteValueDrift > 0
      ? 'amber'
      : 'green';

  return {
    status,
    stockWithoutActiveLayers,
    inventoryValueMismatchCount,
    totalAbsoluteValueDrift,
    negativeOrOverconsumedLayers,
    duplicateActiveSerializedAllocations,
    shipmentLinkStatusMismatch,
    topDriftItems: topDriftRows.map((row) => ({
      inventoryId: row.inventory_id,
      productId: row.product_id,
      productSku: row.product_sku,
      productName: row.product_name,
      locationId: row.location_id,
      locationName: row.location_name,
      quantityOnHand: Number(row.quantity_on_hand ?? 0),
      inventoryValue: Number(row.inventory_value ?? 0),
      layerValue: Number(row.layer_value ?? 0),
      absoluteDrift: Number(row.absolute_drift ?? 0),
    })),
    asOf: new Date().toISOString(),
  };
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
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
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
      .innerJoin(locations, eq(inventory.locationId, locations.id))
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
      .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
      .where(
        and(
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
        costLayers: sql<number>`COALESCE(${costLayerCounts.costLayerCount}, 0)::int`,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(costLayerCounts, eq(costLayerCounts.productId, products.id))
      .where(and(...invConditions))
      .groupBy(products.id, products.sku, products.name, costLayerCounts.costLayerCount)
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
    const ctx = await withAuth();
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
  .inputValidator(cogsCalculationSchema)
  .handler(async ({ data }): Promise<COGSResult> => {
    const ctx = await withAuth();

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
    const ctx = await withAuth();

    const conditions = [eq(inventoryCostLayers.organizationId, ctx.organizationId)];

    // Build age bucket CASE expression
    const buckets = data.ageBuckets.sort((a, b) => a - b);
    const bucketLabels = [
      `0-${buckets[0]} days`,
      ...buckets.slice(0, -1).map((b, i) => `${b + 1}-${buckets[i + 1]} days`),
      `>${buckets[buckets.length - 1]} days`,
    ];

    // Get aging data with cost layers and location
    const aging = await db
      .select({
        inventoryId: inventoryCostLayers.inventoryId,
        productId: inventory.productId,
        productSku: products.sku,
        productName: products.name,
        locationId: inventory.locationId,
        locationName: locations.name,
        layerId: inventoryCostLayers.id,
        receivedAt: inventoryCostLayers.receivedAt,
        quantityRemaining: inventoryCostLayers.quantityRemaining,
        unitCost: inventoryCostLayers.unitCost,
        ageInDays: sql<number>`EXTRACT(DAY FROM NOW() - ${inventoryCostLayers.receivedAt})::int`,
      })
      .from(inventoryCostLayers)
      .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          ...conditions,
          gt(inventoryCostLayers.quantityRemaining, 0),
          data.locationId ? eq(inventory.locationId, data.locationId) : sql`true`
        )
      )
      .orderBy(asc(inventoryCostLayers.receivedAt));

    // Calculate total value for percentage calculations
    const totalValue = aging.reduce(
      (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
      0
    );

    // Group by age bucket
    const bucketData = bucketLabels.map((label, index) => {
      const minDays = index === 0 ? 0 : buckets[index - 1] + 1;
      const maxDays = index < buckets.length ? buckets[index] : Infinity;

      const itemsInBucket = aging.filter(
        (item) => item.ageInDays >= minDays && item.ageInDays <= maxDays
      );

      const totalQuantity = itemsInBucket.reduce((sum, item) => sum + item.quantityRemaining, 0);
      const bucketValue = itemsInBucket.reduce(
        (sum, item) => sum + item.quantityRemaining * Number(item.unitCost),
        0
      );

      // Determine risk level based on age
      const risk = maxDays === Infinity || maxDays >= 365
        ? 'critical'
        : maxDays >= 180
        ? 'high'
        : maxDays >= 90
        ? 'medium'
        : 'low';

      // Aggregate items by productId + locationId
      const aggregatedMap = new Map<string, AggregatedAgingItem>();
      
      itemsInBucket.forEach((item) => {
        const key = `${item.productId}-${item.locationId}`;
        const quantity = item.quantityRemaining;
        const unitCost = Number(item.unitCost);
        const itemValue = quantity * unitCost;
        const itemAge = item.ageInDays;
        const itemRisk: 'low' | 'medium' | 'high' | 'critical' = 
          itemAge >= 365 ? 'critical' :
          itemAge >= 180 ? 'high' :
          itemAge >= 90 ? 'medium' : 'low';

        const existing = aggregatedMap.get(key);
        if (existing) {
          // Aggregate: sum quantities and values, track oldest date, highest risk
          existing.totalQuantity += quantity;
          existing.totalValue += itemValue;
          existing.weightedAverageCost = existing.totalQuantity > 0 
            ? existing.totalValue / existing.totalQuantity 
            : 0;
          
          if (item.receivedAt < existing.oldestReceivedAt) {
            existing.oldestReceivedAt = item.receivedAt;
            existing.ageInDays = itemAge;
          }
          
          // Update risk to highest level
          const riskLevels: Record<'low' | 'medium' | 'high' | 'critical', number> = { 
            low: 0, 
            medium: 1, 
            high: 2, 
            critical: 3 
          };
          if (riskLevels[itemRisk] > riskLevels[existing.highestRisk]) {
            existing.highestRisk = itemRisk;
          }
        } else {
          // Create new aggregated item
          aggregatedMap.set(key, {
            productId: item.productId,
            productSku: item.productSku ?? '',
            productName: item.productName ?? 'Unknown Product',
            locationId: item.locationId,
            locationName: item.locationName ?? 'Unknown',
            totalQuantity: quantity,
            totalValue: itemValue,
            weightedAverageCost: unitCost,
            oldestReceivedAt: item.receivedAt,
            highestRisk: itemRisk,
            ageInDays: itemAge,
          });
        }
      });

      // Convert to array and sort by totalValue descending, then limit to top 10
      const aggregatedItems = Array.from(aggregatedMap.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10)
        .map((agg) => ({
          inventoryId: '', // Not applicable for aggregated items
          productId: agg.productId,
          productSku: agg.productSku,
          productName: agg.productName,
          locationId: agg.locationId,
          locationName: agg.locationName,
          layerId: '', // Not applicable for aggregated items
          receivedAt: agg.oldestReceivedAt,
          quantity: agg.totalQuantity,
          unitCost: agg.weightedAverageCost,
          totalValue: agg.totalValue,
          ageInDays: agg.ageInDays,
          risk: agg.highestRisk,
        }));

      return {
        bucket: label,
        minDays,
        maxDays: maxDays === Infinity ? null : maxDays,
        itemCount: aggregatedMap.size, // Count of unique product+location combinations
        totalQuantity,
        totalValue: bucketValue,
        percentOfTotal: totalValue > 0 ? (bucketValue / totalValue) * 100 : 0,
        risk,
        items: aggregatedItems,
      };
    });

    // Summary
    const totalQuantity = aging.reduce((sum, item) => sum + item.quantityRemaining, 0);
    const avgAge =
      aging.length > 0 && totalQuantity > 0
        ? aging.reduce((sum, item) => sum + item.ageInDays * item.quantityRemaining, 0) /
          totalQuantity
        : 0;

    // Calculate value at risk (items over 180 days old)
    const valueAtRisk = bucketData
      .filter((b) => b.minDays >= 180)
      .reduce((sum, b) => sum + b.totalValue, 0);
    const riskPercentage = totalValue > 0 ? (valueAtRisk / totalValue) * 100 : 0;

    // Count unique product+location combinations across all buckets
    const uniqueProductLocations = new Set<string>();
    bucketData.forEach((bucket) => {
      bucket.items.forEach((item) => {
        uniqueProductLocations.add(`${item.productId}-${item.locationId}`);
      });
    });

    return {
      aging: bucketData,
      summary: {
        totalItems: uniqueProductLocations.size, // Count unique product+location combinations
        totalQuantity,
        totalValue,
        averageAge: Math.round(avgAge),
        valueAtRisk,
        riskPercentage,
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
  .handler(async ({ data }): Promise<InventoryTurnoverResult> => {
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

    // RAW SQL (Phase 11 Keep): CTEs, turnover calculations. Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const cogsPeriodResult = await db.execute<{ cogs: number }>(
      sql`
        SELECT COALESCE(SUM(ABS(total_cost)), 0)::numeric as cogs
        FROM inventory_movements
        WHERE organization_id = ${ctx.organizationId}
          AND movement_type IN ('pick', 'ship')
          AND quantity < 0
          AND created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
          ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
      `
    );

    const cogs = Number((cogsPeriodResult as unknown as { cogs: number }[])[0]?.cogs ?? 0);
    const avgInventory = Number(currentInventory?.totalValue ?? 0);

    // Calculate turnover rate
    const annualizedCOGS = (cogs / periodDays) * 365;
    const turnoverRate = avgInventory > 0 ? annualizedCOGS / avgInventory : 0;
    const daysOnHand = turnoverRate > 0 ? 365 / turnoverRate : 0;

    // Get turnover by product (top 20) - current period
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
            AND movement_type IN ('pick', 'ship')
            AND quantity < 0
            AND created_at >= NOW() - INTERVAL '1 day' * ${periodDays}
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
          COALESCE(NULLIF(p.sku, ''), 'N/A') as product_sku,
          COALESCE(NULLIF(p.name, ''), 'Unknown Product') as product_name,
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
          AND p.deleted_at IS NULL
          AND p.name IS NOT NULL
          AND TRIM(p.name) != ''
          AND (COALESCE(pi.inventory_value, 0) > 0 OR COALESCE(pc.period_cogs, 0) > 0)
        ORDER BY turnover_rate DESC
        LIMIT 20
      `
    );

    // Get previous period turnover rates for trend calculation
    // Calculate historical inventory value by reconstructing from movements:
    // 1. Calculate quantity at end of previous period (sum all movements up to that point)
    // 2. Calculate weighted average unit cost from receive movements up to that point
    // 3. Multiply quantity * average cost to get historical inventory value
    const previousPeriodDays = periodDays;
    const previousPeriodStart = periodDays * 2;
    const previousPeriodEnd = periodDays;
    const previousPeriodEndDate = sql`NOW() - INTERVAL '1 day' * ${previousPeriodEnd}`;
    const previousTurnoverByProduct = await db.execute<{
      productId: string;
      turnoverRate: number;
    }>(
      sql`
        WITH product_cogs_prev AS (
          SELECT
            product_id,
            COALESCE(SUM(ABS(total_cost)), 0) as period_cogs
          FROM inventory_movements
          WHERE organization_id = ${ctx.organizationId}
            AND movement_type IN ('pick', 'ship')
            AND quantity < 0
            AND created_at >= ${previousPeriodEndDate}
            AND created_at < NOW() - INTERVAL '1 day' * ${previousPeriodStart}
            ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
          GROUP BY product_id
        ),
        -- Calculate historical inventory quantity at end of previous period
        historical_quantity AS (
          SELECT
            product_id,
            COALESCE(SUM(quantity), 0) as net_quantity
          FROM inventory_movements
          WHERE organization_id = ${ctx.organizationId}
            AND created_at < ${previousPeriodEndDate}
            ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
          GROUP BY product_id
        ),
        -- Calculate weighted average unit cost from receive movements up to previous period end
        -- Include all positive movements (receives, adjustments, transfers in) that have unit_cost
        historical_cost AS (
          SELECT
            product_id,
            CASE
              WHEN SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN quantity ELSE 0 END) > 0
              THEN SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN unit_cost * quantity ELSE 0 END) / 
                   SUM(CASE WHEN quantity > 0 AND unit_cost IS NOT NULL THEN quantity ELSE 0 END)
              ELSE NULL
            END as avg_unit_cost
          FROM inventory_movements
          WHERE organization_id = ${ctx.organizationId}
            AND quantity > 0
            AND unit_cost IS NOT NULL
            AND unit_cost > 0
            AND created_at < ${previousPeriodEndDate}
            ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
          GROUP BY product_id
        ),
        -- Calculate historical inventory value
        -- If no cost data available, fall back to current inventory unit cost (less accurate but better than zero)
        current_inventory_cost AS (
          SELECT
            product_id,
            CASE
              WHEN SUM(quantity_on_hand) > 0
              THEN SUM(total_value) / SUM(quantity_on_hand)
              ELSE NULL
            END as current_avg_cost
          FROM inventory
          WHERE organization_id = ${ctx.organizationId}
          GROUP BY product_id
        ),
        product_inventory_prev AS (
          SELECT
            COALESCE(hq.product_id, hc.product_id, cic.product_id) as product_id,
            CASE
              WHEN COALESCE(hq.net_quantity, 0) <= 0 THEN 0
              WHEN COALESCE(hc.avg_unit_cost, 0) > 0 THEN COALESCE(hq.net_quantity, 0) * hc.avg_unit_cost
              WHEN COALESCE(cic.current_avg_cost, 0) > 0 THEN COALESCE(hq.net_quantity, 0) * cic.current_avg_cost
              ELSE 0
            END as inventory_value
          FROM historical_quantity hq
          FULL OUTER JOIN historical_cost hc ON hq.product_id = hc.product_id
          FULL OUTER JOIN current_inventory_cost cic ON COALESCE(hq.product_id, hc.product_id) = cic.product_id
        )
        SELECT
          p.id as product_id,
          CASE
            WHEN COALESCE(pi.inventory_value, 0) > 0
            THEN ((COALESCE(pc.period_cogs, 0) / ${previousPeriodDays}) * 365) / pi.inventory_value
            ELSE 0
          END::numeric as turnover_rate
        FROM products p
        LEFT JOIN product_inventory_prev pi ON p.id = pi.product_id
        LEFT JOIN product_cogs_prev pc ON p.id = pc.product_id
        WHERE p.organization_id = ${ctx.organizationId}
          AND p.deleted_at IS NULL
          ${data.productId ? sql`AND p.id = ${data.productId}` : sql``}
      `
    );

    // Create a map of previous period turnover rates for quick lookup
    const previousTurnoverMap = new Map<string, number>();
    for (const item of previousTurnoverByProduct as unknown as Array<{ product_id: string; turnover_rate: number }>) {
      previousTurnoverMap.set(item.product_id, Number(item.turnover_rate ?? 0));
    }

    // Calculate trends for last 4 periods (monthly if 90d, weekly if 30d)
    const trendPeriods: Array<{ period: string; turnoverRate: number; daysOnHand: number }> = [];
    const trendInterval = periodDays === 30 ? 7 : periodDays === 90 ? 30 : 90; // weeks for 30d, months for 90d, quarters for 365d

    for (let i = 3; i >= 0; i--) {
      const periodStart = periodDays - (i + 1) * trendInterval;
      const periodEnd = periodDays - i * trendInterval;

      const trendCogsResult = await db.execute<{ cogs: number }>(
        sql`
          SELECT COALESCE(SUM(ABS(total_cost)), 0)::numeric as cogs
          FROM inventory_movements
          WHERE organization_id = ${ctx.organizationId}
            AND movement_type IN ('pick', 'ship')
            AND quantity < 0
            AND created_at >= NOW() - INTERVAL '1 day' * ${periodEnd}
            AND created_at < NOW() - INTERVAL '1 day' * ${periodStart}
            ${data.productId ? sql`AND product_id = ${data.productId}` : sql``}
        `
      );

      const trendCogsNum = Number((trendCogsResult as unknown as { cogs: number }[])[0]?.cogs ?? 0);
      const trendAnnualizedCOGS = (trendCogsNum / trendInterval) * 365;
      const trendTurnoverRate = avgInventory > 0 ? trendAnnualizedCOGS / avgInventory : 0;
      const trendDaysOnHand = trendTurnoverRate > 0 ? 365 / trendTurnoverRate : 0;

      trendPeriods.push({
        period: i === 0 ? 'Current' : `Period ${4 - i}`,
        turnoverRate: Math.round(trendTurnoverRate * 100) / 100,
        daysOnHand: Math.round(trendDaysOnHand),
      });
    }

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
          product_id: string;
          product_sku: string;
          product_name: string;
          inventory_value: number;
          period_cogs: number;
          turnover_rate: number;
        }>
      ).map((p) => {
        const inventoryValue = Number(p.inventory_value ?? 0);
        const periodCOGS = Number(p.period_cogs ?? 0);
        const turnoverRate = Number(p.turnover_rate ?? 0);
        const previousTurnoverRate = previousTurnoverMap.get(p.product_id ?? '') ?? 0;

        // Calculate trend percentage change
        const trendPercentage =
          previousTurnoverRate === 0
            ? 0
            : ((turnoverRate - previousTurnoverRate) / previousTurnoverRate) * 100;

        // Determine trend direction based on percentage change threshold (5%)
        const TREND_THRESHOLD = 5;
        let trend: 'up' | 'down' | 'stable';
        if (Math.abs(trendPercentage) < TREND_THRESHOLD) {
          trend = 'stable';
        } else if (trendPercentage > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }

        return {
          productId: p.product_id ?? '',
          productSku: p.product_sku ?? '',
          productName: p.product_name ?? 'Unknown Product',
          inventoryValue: isNaN(inventoryValue) ? 0 : inventoryValue,
          periodCOGS: isNaN(periodCOGS) ? 0 : periodCOGS,
          turnoverRate: isNaN(turnoverRate) ? 0 : turnoverRate,
          trend,
          trendPercentage: Math.round(trendPercentage * 100) / 100,
        };
      }),
      trends: trendPeriods,
      benchmarks: {
        excellent: 12, // 12+ turns per year
        good: 6, // 6-12 turns
        average: 3, // 3-6 turns
        poor: 1, // <3 turns
      },
    };
  });

// ============================================================================
// PRODUCT COST LAYERS
// ============================================================================

/**
 * Get all cost layers for a product (across all inventory records).
 * Used in product detail view to show FIFO cost breakdown.
 */
export const getProductCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });

    const layers = await db
      .select({
        id: inventoryCostLayers.id,
        receivedAt: inventoryCostLayers.receivedAt,
        quantityReceived: inventoryCostLayers.quantityReceived,
        quantityRemaining: inventoryCostLayers.quantityRemaining,
        unitCost: inventoryCostLayers.unitCost,
        referenceType: inventoryCostLayers.referenceType,
        referenceId: inventoryCostLayers.referenceId,
        createdAt: inventoryCostLayers.createdAt,
      })
      .from(inventoryCostLayers)
      .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
      .where(
        and(
          eq(inventory.productId, data.productId),
          eq(inventory.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(inventoryCostLayers.receivedAt));

    // Calculate summary
    const activeLayers = layers.filter((l) => l.quantityRemaining > 0);
    const totalRemaining = activeLayers.reduce((sum, l) => sum + l.quantityRemaining, 0);
    const totalValue = activeLayers.reduce(
      (sum, l) => sum + l.quantityRemaining * Number(l.unitCost),
      0
    );
    const weightedAvgCost = totalRemaining > 0 ? totalValue / totalRemaining : 0;
    const lastPurchaseCost =
      layers.length > 0 ? Number(layers[layers.length - 1].unitCost) : 0;

    return {
      layers: layers.map((l) => ({
        ...l,
        unitCost: Number(l.unitCost),
      })),
      summary: {
        totalLayers: layers.length,
        activeLayers: activeLayers.length,
        totalRemaining,
        totalValue,
        weightedAvgCost,
        lastPurchaseCost,
      },
    };
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

    // Get all active cost layers for this product
    const layers = await db
      .select({
        quantityRemaining: inventoryCostLayers.quantityRemaining,
        unitCost: inventoryCostLayers.unitCost,
      })
      .from(inventoryCostLayers)
      .innerJoin(inventory, eq(inventoryCostLayers.inventoryId, inventory.id))
      .where(
        and(
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
      .where(eq(products.id, data.productId));

    return { productId: data.productId, costPrice: weightedAvgCost, updated: true };
  });

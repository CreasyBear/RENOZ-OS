/**
 * Inventory Valuation Server Functions
 *
 * FIFO cost layer tracking, inventory valuation, and COGS calculations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, asc, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { inventory, inventoryCostLayers, products } from 'drizzle/schema';
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
  type InventoryTurnoverResult,
  type COGSResult,
  type InventoryFinanceIntegritySummary,
  type InventoryFinanceReconcileResult,
} from '@/lib/schemas/inventory';
import { recomputeInventoryValueFromLayers } from '@/server/functions/_shared/inventory-finance';
import { getFinanceIntegritySummary } from './finance-integrity-summary';
import {
  listInventoryCostLayers,
  readInventoryCostLayers,
} from './inventory-cost-layers-read';
import { readInventoryAging } from './inventory-aging-read';
import { readInventoryTurnover } from './inventory-turnover-read';
import { readInventoryValuation } from './inventory-valuation-read';
import { readProductCostLayers } from './product-cost-layers-read';

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
    return listInventoryCostLayers({
      organizationId: ctx.organizationId,
      page,
      pageSize,
      inventoryId: filters.inventoryId,
      hasRemaining: filters.hasRemaining,
    });
  });

/**
 * Get cost layers for a specific inventory item.
 */
export const getInventoryCostLayers = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(z.object({ inventoryId: z.string().uuid() })))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return readInventoryCostLayers({
      organizationId: ctx.organizationId,
      inventoryId: data.inventoryId,
    });
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
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return readInventoryValuation({
      organizationId: ctx.organizationId,
      locationId: data.locationId,
      productId: data.productId,
      valuationMethod: data.valuationMethod,
    });
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

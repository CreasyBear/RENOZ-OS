/**
 * Inventory Valuation Server Functions
 *
 * FIFO cost layer tracking, inventory valuation, and COGS calculations.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json for specification
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
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
  type InventoryFinanceIntegritySummary,
} from '@/lib/schemas/inventory';
import { getFinanceIntegritySummary } from './finance-integrity-summary';
import { reconcileInventoryFinanceIntegrityState } from './inventory-finance-reconcile';
import { createManualInventoryCostLayer } from './inventory-cost-layer-create';
import {
  listInventoryCostLayers,
  readInventoryCostLayers,
} from './inventory-cost-layers-read';
import { previewInventoryCogs } from './inventory-cogs-preview';
import { readInventoryAging } from './inventory-aging-read';
import { readInventoryTurnover } from './inventory-turnover-read';
import { readInventoryValuation } from './inventory-valuation-read';
import { readProductCostLayers } from './product-cost-layers-read';
import { updateWeightedAverageProductCost } from './product-weighted-average-cost';

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
    return createManualInventoryCostLayer({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
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
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.manage });
    return reconcileInventoryFinanceIntegrityState({
      organizationId: ctx.organizationId,
      dryRun: data.dryRun,
      limit: data.limit,
    });
  });

/**
 * Calculate cost of goods sold using FIFO.
 */
export const calculateCOGS = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(cogsCalculationSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.read });
    return previewInventoryCogs({
      organizationId: ctx.organizationId,
      inventoryId: data.inventoryId,
      quantity: data.quantity,
      simulate: data.simulate,
    });
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
    return updateWeightedAverageProductCost({
      organizationId: ctx.organizationId,
      productId: data.productId,
    });
  });

/**
 * Tracked Products Schemas
 *
 * Validation schemas for user-configurable tracked products on the dashboard.
 * Products are selected by the user and stored in localStorage.
 * Inventory counts are fetched from the server.
 */

import { z } from 'zod';

// ============================================================================
// TRACKED PRODUCT
// ============================================================================

/**
 * Schema for a product being tracked on the dashboard.
 */
export const trackedProductSchema = z.object({
  /** Product UUID */
  id: z.string().uuid(),
  /** Product SKU */
  sku: z.string(),
  /** Product name */
  name: z.string(),
  /** Optional custom label for display */
  label: z.string().optional(),
});

export type TrackedProduct = z.infer<typeof trackedProductSchema>;

/**
 * Schema for a tracked product with inventory data.
 */
export const trackedProductWithInventorySchema = trackedProductSchema.extend({
  /** Total quantity on hand across all locations */
  quantity: z.number().int().nonnegative(),
});

export type TrackedProductWithInventory = z.infer<typeof trackedProductWithInventorySchema>;

// ============================================================================
// SERVER FUNCTION SCHEMAS
// ============================================================================

/**
 * Input schema for getInventoryCountsByProductIds server function.
 */
export const getInventoryCountsByProductIdsInputSchema = z.object({
  productIds: z.array(z.string().uuid()),
});

export type GetInventoryCountsByProductIdsInput = z.infer<typeof getInventoryCountsByProductIdsInputSchema>;

/**
 * Single product inventory result.
 */
export const productInventoryResultSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  totalQuantity: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative(),
});

export type ProductInventoryResult = z.infer<typeof productInventoryResultSchema>;

/**
 * Output schema for getInventoryCountsByProductIds server function.
 * Record keyed by product ID.
 */
export const getInventoryCountsByProductIdsOutputSchema = z.record(
  z.string().uuid(),
  productInventoryResultSchema
);

export type GetInventoryCountsByProductIdsOutput = z.infer<typeof getInventoryCountsByProductIdsOutputSchema>;

// ============================================================================
// SKU PATTERN SCHEMAS (for legacy/advanced use)
// ============================================================================

/**
 * Schema for SKU pattern group (matches multiple products by pattern).
 */
export const skuPatternGroupSchema = z.object({
  /** Unique key for this group */
  key: z.string(),
  /** Array of SKU patterns to match (case-insensitive partial match) */
  patterns: z.array(z.string()),
});

export type SkuPatternGroup = z.infer<typeof skuPatternGroupSchema>;

/**
 * Input schema for getInventoryCountsBySkus server function.
 */
export const getInventoryCountsBySkusInputSchema = z.object({
  skuPatterns: z.array(skuPatternGroupSchema),
});

export type GetInventoryCountsBySkusInput = z.infer<typeof getInventoryCountsBySkusInputSchema>;

/**
 * Inventory count result for a SKU pattern group.
 */
export const inventoryCountResultSchema = z.object({
  totalQuantity: z.number().int().nonnegative(),
  productCount: z.number().int().nonnegative(),
  products: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      quantity: z.number().int().nonnegative(),
    })
  ),
});

export type InventoryCountResult = z.infer<typeof inventoryCountResultSchema>;

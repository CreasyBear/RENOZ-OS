/**
 * Inventory base stock-level schemas.
 *
 * Read/list/search/detail contracts live in ./reads.ts.
 */

import { z } from 'zod';
import {
  currencySchema,
  quantitySchema,
} from '../_shared/patterns';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const inventoryStatusValues = [
  'available',
  'allocated',
  'sold',
  'damaged',
  'returned',
  'quarantined',
] as const;

export const qualityStatusValues = ['good', 'damaged', 'expired', 'quarantined'] as const;

export const inventoryStatusSchema = z.enum(inventoryStatusValues);
export const qualityStatusSchema = z.enum(qualityStatusValues);

// ============================================================================
// INVENTORY CONSTANTS
// ============================================================================

/**
 * Default low stock threshold used across inventory functions.
 * Products with total available quantity below this threshold are considered low stock.
 * This matches the threshold used in the inventory index page.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

// ============================================================================
// INVENTORY (Stock Level)
// ============================================================================

export const inventorySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: inventoryStatusSchema,
  quantityOnHand: quantitySchema,
  quantityAllocated: quantitySchema,
  quantityAvailable: quantitySchema,
  unitCost: currencySchema,
  totalValue: currencySchema,
  lotNumber: z.string().nullable(),
  serialNumber: z.string().nullable(),
  expiryDate: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Inventory = z.infer<typeof inventorySchema>;

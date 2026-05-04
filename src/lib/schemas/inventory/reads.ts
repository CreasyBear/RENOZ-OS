/**
 * Inventory read/list/search/detail schemas.
 *
 * Owns operator-facing stock visibility contracts for browser, search, and detail reads.
 */

import { z } from 'zod';
import {
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
  paginationSchema,
} from '../_shared/patterns';
import type { FlexibleJson, JsonValue } from '../_shared/patterns';
import {
  inventoryStatusSchema,
  qualityStatusSchema,
} from './inventory';
import type { LocationType } from './warehouse-locations';

// ============================================================================
// INVENTORY FILTERS
// ============================================================================

const ageRangeSchema = z.enum(['all', '0-30', '31-60', '61-90', '90+']);

export const inventoryFilterSchema = filterSchema.extend({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.union([inventoryStatusSchema, z.array(inventoryStatusSchema)]).optional(),
  qualityStatus: z.union([qualityStatusSchema, z.array(qualityStatusSchema)]).optional(),
  ageRange: ageRangeSchema.optional(),
  lowStock: z.coerce.boolean().optional(),
  minQuantity: z.coerce.number().nonnegative().optional(),
  maxQuantity: z.coerce.number().nonnegative().optional(),
  minValue: z.coerce.number().nonnegative().optional(),
  maxValue: z.coerce.number().nonnegative().optional(),
});

export type InventoryFilter = z.infer<typeof inventoryFilterSchema>;

export const INVENTORY_SORT_FIELDS = [
  'createdAt',
  'quantityOnHand',
  'totalValue',
  'status',
] as const;

export const inventorySortFieldSchema = z.enum(INVENTORY_SORT_FIELDS);

export type InventorySortField = z.infer<typeof inventorySortFieldSchema>;

// ============================================================================
// INVENTORY READ INPUTS
// ============================================================================

export const inventoryListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(inventoryFilterSchema).extend({
    sortBy: inventorySortFieldSchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

export const quickSearchInventorySchema = normalizeObjectInput(
  z.object({
    q: z.string().min(2),
    limit: z.number().int().positive().default(10),
  })
);

export type QuickSearchInventoryInput = z.infer<typeof quickSearchInventorySchema>;

export const locationParamsSchema = idParamSchema;
export type LocationParams = z.infer<typeof locationParamsSchema>;

export const inventoryParamsSchema = idParamSchema;
export type InventoryParams = z.infer<typeof inventoryParamsSchema>;

// ============================================================================
// HOOK FILTER TYPES
// ============================================================================

/**
 * Filters for inventory queries in hooks.
 */
export interface InventoryFilters {
  search?: string;
  productId?: string;
  locationId?: string;
  status?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// READ RESPONSE TYPES
// ============================================================================

/**
 * Inventory item response for hooks.
 */
export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  reorderPoint: number;
  safetyStock: number;
  unitCost: number;
  totalValue: number;
  lastMovementAt: Date | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
}

/**
 * Inventory list result from listInventory server function.
 */
export interface ListInventoryResult {
  items: InventoryWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totals: {
    totalValue: number;
    totalItems: number;
    totalSkus: number;
    lowStockCount: number;
  };
}

/**
 * Inventory item with product and location relations.
 */
export interface InventoryWithRelations {
  id: string;
  organizationId: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  unitCost: number | null;
  totalValue: number | null;
  status: string;
  lotNumber: string | null;
  serialNumber: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  qualityStatus?: string | null;
  metadata: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    categoryId: string | null;
    costPrice: number | null;
    reorderPoint?: number | null;
    reorderQty?: number | null;
    [key: string]: JsonValue | undefined;
  } | null;
  location: {
    id: string;
    name: string;
    locationCode: string;
    locationType: LocationType;
    capacity?: number | null;
    [key: string]: JsonValue | undefined;
  } | null;
}

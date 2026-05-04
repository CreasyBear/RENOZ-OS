/**
 * Inventory Zod Schemas
 *
 * Validation schemas for inventory, locations, and movements.
 */

import { z } from 'zod';
import {
  currencySchema,
  quantitySchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
} from '../_shared/patterns';
import type { FlexibleJson, JsonValue } from '../_shared/patterns';
import { locationAddressSchema } from './locations';
import type { LocationType } from './warehouse-locations';

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

// ============================================================================
// INVENTORY FILTERS
// ============================================================================

const ageRangeSchema = z.enum(["all", "0-30", "31-60", "61-90", "90+"]);

export const inventoryFilterSchema = filterSchema.extend({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.union([inventoryStatusSchema, z.array(inventoryStatusSchema)]).optional(),
  qualityStatus: z.union([qualityStatusSchema, z.array(qualityStatusSchema)]).optional(),
  ageRange: ageRangeSchema.optional(),
  lowStock: z.coerce.boolean().optional(), // Below reorder point
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
// INVENTORY LIST QUERY
// ============================================================================

export const inventoryListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(inventoryFilterSchema).extend({
    sortBy: inventorySortFieldSchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

// ============================================================================
// PARAMS
// ============================================================================

export const locationParamsSchema = idParamSchema;
export type LocationParams = z.infer<typeof locationParamsSchema>;

export const inventoryParamsSchema = idParamSchema;
export type InventoryParams = z.infer<typeof inventoryParamsSchema>;

// ============================================================================
// LOCATION ATTRIBUTES
// ============================================================================

/** Attributes for warehouse locations (JSONB; may include isDefault, etc.) */
export const locationAttributesSchema = z
  .object({
    isDefault: z.boolean().optional(),
    allowNegative: z.boolean().optional(),
    description: z.string().optional(),
    address: locationAddressSchema.optional(),
  })
  .passthrough();

export type LocationAttributes = z.infer<typeof locationAttributesSchema>;

// ============================================================================
// ============================================================================
// MOVEMENT RESPONSE TYPES
// ============================================================================

export interface MovementWithRelations {
  id: string;
  organizationId: string;
  inventoryId: string;
  productId: string;
  locationId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number | null;
  newQuantity: number | null;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber?: string | null;
  performedByName?: string | null;
  metadata: FlexibleJson | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  productName: string | null;
  productSku: string | null;
  locationName: string | null;
  locationCode: string | null;
}

/**
 * Movement list result
 */
export interface ListMovementsResult {
  movements: MovementWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    totalInbound: number;
    totalOutbound: number;
    netChange: number;
  };
}

/**
 * Movement type counts for aggregation
 */
export interface MovementTypeCount {
  count: number;
  units: number;
  value: number;
}

/**
 * Product movement aggregation for top movers calculation
 */
export interface ProductMovementAggregation {
  productId: string;
  productName: string;
  productSku: string;
  unitsIn: number;
  unitsOut: number;
  count: number;
}

/**
 * Top moving product as returned from getInventoryDashboard (topMoving)
 */
export interface DashboardTopMovingItem {
  productId: string;
  productName: string | null;
  productSku?: string | null;
  sku?: string | null;
  movementCount: number;
  totalQuantity: number;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Date group aggregation for movement trends
 */
export interface DateGroupAggregation {
  unitsIn: number;
  unitsOut: number;
  count: number;
}

// ============================================================================
// HOOK FILTER TYPES
// ============================================================================

/**
 * Filters for inventory queries in hooks
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
// HOOK RESPONSE TYPES
// ============================================================================

/**
 * Inventory item response for hooks
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
 * Movement record response for hooks
 */
export interface MovementRecord {
  id: string;
  inventoryId: string;
  movementType: 'receive' | 'issue' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  unitCost: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

/**
 * Inventory adjustment input for hooks
 */
export interface InventoryAdjustment {
  inventoryId: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  notes?: string;
}

/**
 * Inventory transfer input for hooks
 */
export interface InventoryTransfer {
  fromInventoryId: string;
  toInventoryId: string;
  quantity: number;
  reason: string;
  notes?: string;
}

/**
 * Inventory receiving input for hooks
 */
export interface InventoryReceiving {
  inventoryId: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
}

// ============================================================================
// QUALITY RECORD
// ============================================================================

/** Quality inspection record for inventory item detail view */
export interface QualityRecord {
  id: string;
  inspectionDate: Date;
  inspectorName: string | null;
  result: 'pass' | 'fail' | 'conditional' | string;
  notes?: string;
  defects?: string[];
}

/**
 * Inventory list result from listInventory server function
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
 * Inventory item with product and location relations
 * Note: This extends the base Inventory type but allows for partial product/location data
 */
export interface InventoryWithRelations {
  // All Inventory fields
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
  // Note: qualityStatus is mentioned in PRD but not implemented in actual inventory table schema
  // Components may derive it from status field or other sources
  qualityStatus?: string | null;
  metadata: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  // Relations
  product: {
    id: string;
    name: string;
    sku: string;
    categoryId: string | null;
    costPrice: number | null;
    reorderPoint?: number | null; // Product reorder point (exists on products table)
    reorderQty?: number | null; // Product reorder quantity (exists on products table)
    // Note: maxStockLevel and safetyStock are NOT on products table
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

/**
 * WMS Dashboard stock by category
 */
export const categoryStockSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string(),
  unitCount: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
});
export type CategoryStock = z.infer<typeof categoryStockSchema>;

/**
 * WMS Dashboard stock by location
 */
export const locationStockSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationType: z.string(),
  unitCount: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  percentage: z.number().int().min(0).max(100),
});
export type LocationStock = z.infer<typeof locationStockSchema>;

/**
 * Recent movement for timeline display.
 * timestamp is ISO string over wire (Date serializes to string in JSON).
 */
export const recentMovementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['receipt', 'transfer', 'allocation']),
  timestamp: z.union([z.string(), z.coerce.date()]), // ISO string or Date
  description: z.string(),
  reference: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  productName: z.string(),
  productSku: z.string(),
  location: z.string(),
  toLocation: z.string().nullable(),
});
export type RecentMovement = z.infer<typeof recentMovementSchema>;

/**
 * Dashboard comparison data (previous period vs current)
 */
export const dashboardComparisonSchema = z.object({
  totalValueChange: z.number(),
  totalUnitsChange: z.number(),
  totalSkusChange: z.number().int(),
  alertsChange: z.number().int(),
  locationsChange: z.number().int(),
});
export type DashboardComparison = z.infer<typeof dashboardComparisonSchema>;

/**
 * WMS Dashboard complete data structure
 */
export const wmsDashboardDataSchema = z.object({
  totals: z.object({
    totalValue: z.number().nonnegative(),
    totalUnits: z.number().int().nonnegative(),
    totalSkus: z.number().int().nonnegative(),
  }),
  comparison: dashboardComparisonSchema.optional(),
  stockByCategory: z.array(categoryStockSchema),
  stockByLocation: z.array(locationStockSchema),
  recentMovements: z.array(recentMovementSchema),
});
export type WMSDashboardData = z.infer<typeof wmsDashboardDataSchema>;

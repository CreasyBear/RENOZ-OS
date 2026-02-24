/**
 * Inventory Zod Schemas
 *
 * Validation schemas for inventory, locations, and movements.
 */

import { z } from 'zod';
import {
  addressSchema,
  currencySchema,
  quantitySchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from '../_shared/patterns';
import type { FlexibleJson, JsonValue } from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

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

export const movementTypeValues = [
  'receive',
  'allocate',
  'deallocate',
  'pick',
  'ship',
  'adjust',
  'return',
  'transfer',
] as const;

export const qualityStatusValues = ['good', 'damaged', 'expired', 'quarantined'] as const;

export const inventoryStatusSchema = z.enum(inventoryStatusValues);
export const movementTypeSchema = z.enum(movementTypeValues);
export const qualityStatusSchema = z.enum(qualityStatusValues);
export type MovementType = z.infer<typeof movementTypeSchema>;

export function isValidMovementType(value: unknown): value is MovementType {
  return typeof value === 'string' && movementTypeValues.includes(value as MovementType);
}

// ============================================================================
// LOCATION ADDRESS
// ============================================================================

export const locationAddressSchema = addressSchema.partial();

export type LocationAddress = z.infer<typeof locationAddressSchema>;

// ============================================================================
// CREATE LOCATION
// ============================================================================

export const createLocationSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(500).optional(),
  address: locationAddressSchema.optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  allowNegative: z.boolean().default(false),
});

export type CreateLocation = z.infer<typeof createLocationSchema>;

// ============================================================================
// UPDATE LOCATION
// ============================================================================

export const updateLocationSchema = createLocationSchema.partial();

export type UpdateLocation = z.infer<typeof updateLocationSchema>;

// ============================================================================
// LOCATION (output)
// ============================================================================

export const locationSchema = createLocationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Location = z.infer<typeof locationSchema>;

// ============================================================================
// LOCATION FILTERS
// ============================================================================

export const locationFilterSchema = filterSchema.extend({
  isActive: z.coerce.boolean().optional(),
});

export type LocationFilter = z.infer<typeof locationFilterSchema>;

// ============================================================================
// LOCATION LIST QUERY
// ============================================================================

export const locationListQuerySchema = paginationSchema.merge(locationFilterSchema);

export type LocationListQuery = z.infer<typeof locationListQuerySchema>;

export const locationListCursorQuerySchema = cursorPaginationSchema.merge(locationFilterSchema);

export type LocationListCursorQuery = z.infer<typeof locationListCursorQuerySchema>;

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

// ============================================================================
// INVENTORY LIST QUERY
// ============================================================================

export const inventoryListQuerySchema = paginationSchema.merge(inventoryFilterSchema);

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

// ============================================================================
// MOVEMENT METADATA
// ============================================================================

export const movementMetadataSchema = z
  .object({
    reference: z.string().max(255).optional(),
    orderId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    reason: z.string().max(500).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE §4
export type MovementMetadata = FlexibleJson | null;

// ============================================================================
// CREATE INVENTORY MOVEMENT
// ============================================================================

export const createMovementSchema = z.object({
  productId: z.string().uuid('Product is required'),
  locationId: z.string().uuid('Location is required'),
  movementType: movementTypeSchema,
  quantity: z.number(), // Can be negative
  unitCost: currencySchema.optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  metadata: movementMetadataSchema.default({}),
  notes: z.string().max(500).optional(),
});

export type CreateMovement = z.infer<typeof createMovementSchema>;

// ============================================================================
// INVENTORY MOVEMENT (output)
// ============================================================================

export const movementSchema = createMovementSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  previousQuantity: quantitySchema,
  newQuantity: quantitySchema,
  totalCost: currencySchema,
  createdAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
});

export type Movement = z.infer<typeof movementSchema>;

// ============================================================================
// MOVEMENT FILTERS
// ============================================================================

export const movementFilterSchema = filterSchema.extend({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  movementType: movementTypeSchema.optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

export type MovementFilter = z.infer<typeof movementFilterSchema>;

// ============================================================================
// MOVEMENT LIST QUERY
// ============================================================================

export const movementListQuerySchema = paginationSchema.merge(movementFilterSchema);

export type MovementListQuery = z.infer<typeof movementListQuerySchema>;

// ============================================================================
// PARAMS
// ============================================================================

export const locationParamsSchema = idParamSchema;
export type LocationParams = z.infer<typeof locationParamsSchema>;

export const inventoryParamsSchema = idParamSchema;
export type InventoryParams = z.infer<typeof inventoryParamsSchema>;

// ============================================================================
// STOCK ADJUSTMENT
// ============================================================================

export const stockAdjustmentSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustmentQty: z.number(), // Positive or negative
  reason: z.string().min(1, 'Reason is required').max(500),
  notes: z.string().max(500).optional(),
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

// ============================================================================
// STOCK TRANSFER
// ============================================================================

export const stockTransferSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: quantitySchema,
  serialNumbers: z.array(z.string().min(1)).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export type StockTransfer = z.infer<typeof stockTransferSchema>;

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
// WAREHOUSE MANAGEMENT ENUMS
// ============================================================================

export const stockCountStatusValues = ['draft', 'in_progress', 'completed', 'cancelled'] as const;

export const stockCountTypeValues = ['full', 'cycle', 'spot', 'annual'] as const;

export const inventoryAlertTypeValues = [
  'low_stock',
  'out_of_stock',
  'overstock',
  'expiry',
  'slow_moving',
  'forecast_deviation',
] as const;

export const forecastIntervalValues = ['daily', 'weekly', 'monthly'] as const;

export const costLayerReferenceTypeValues = ['purchase_order', 'adjustment', 'transfer', 'rma'] as const;

export const stockCountStatusSchema = z.enum(stockCountStatusValues);
export const stockCountTypeSchema = z.enum(stockCountTypeValues);
export const inventoryAlertTypeSchema = z.enum(inventoryAlertTypeValues);
export const forecastIntervalSchema = z.enum(forecastIntervalValues);
export const costLayerReferenceTypeSchema = z.enum(costLayerReferenceTypeValues);

// ============================================================================
// STOCK COUNT
// ============================================================================

export const stockCountMetadataSchema = z
  .object({
    instructions: z.string().max(1000).optional(),
    varianceNotes: z.string().max(1000).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE §4
export type StockCountMetadata = FlexibleJson | null;

export const createStockCountSchema = z.object({
  countCode: z.string().min(1, 'Count code is required').max(20),
  countType: stockCountTypeSchema.default('cycle'),
  locationId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  varianceThreshold: z.coerce.number().min(0).max(100).default(5),
  notes: z.string().max(1000).optional(),
  metadata: stockCountMetadataSchema.default({}),
});

export type CreateStockCount = z.infer<typeof createStockCountSchema>;

export const updateStockCountSchema = createStockCountSchema.partial().extend({
  status: stockCountStatusSchema.optional(),
});

export type UpdateStockCount = z.infer<typeof updateStockCountSchema>;

export const stockCountSchema = createStockCountSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: stockCountStatusSchema,
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  version: z.number(),
});

export type StockCount = z.infer<typeof stockCountSchema>;

export const stockCountFilterSchema = filterSchema.extend({
  status: stockCountStatusSchema.optional(),
  countType: stockCountTypeSchema.optional(),
  locationId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export type StockCountFilter = z.infer<typeof stockCountFilterSchema>;

export const stockCountListQuerySchema = paginationSchema.merge(stockCountFilterSchema);
export type StockCountListQuery = z.infer<typeof stockCountListQuerySchema>;

// ============================================================================
// STOCK COUNT ITEMS
// ============================================================================

export const createStockCountItemSchema = z.object({
  inventoryId: z.string().uuid('Inventory item is required'),
  expectedQuantity: z.number().int(),
});

export type CreateStockCountItem = z.infer<typeof createStockCountItemSchema>;

export const updateStockCountItemSchema = z.object({
  countedQuantity: z.number().int().optional(),
  varianceReason: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateStockCountItem = z.infer<typeof updateStockCountItemSchema>;

export const stockCountItemSchema = z.object({
  id: z.string().uuid(),
  stockCountId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  expectedQuantity: z.number().int(),
  countedQuantity: z.number().int().nullable(),
  varianceReason: z.string().nullable(),
  countedBy: z.string().uuid().nullable(),
  countedAt: z.coerce.date().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StockCountItem = z.infer<typeof stockCountItemSchema>;

/**
 * Extended stock count item with inventory, product, and location relations
 * as returned from getStockCount server function
 */
export interface StockCountItemWithRelations extends StockCountItem {
  inventory?: {
    product?: {
      name?: string;
      sku?: string;
    };
    location?: {
      name?: string;
    };
    productId?: string;
    unitCost?: number | null;
  } | null;
}

// ============================================================================
// INVENTORY COST LAYERS
// ============================================================================

export const createCostLayerSchema = z.object({
  inventoryId: z.string().uuid('Inventory item is required'),
  receivedAt: z.coerce.date(),
  quantityReceived: z.number().int().positive(),
  quantityRemaining: z.number().int().min(0),
  unitCost: z.coerce.number().min(0),
  referenceType: costLayerReferenceTypeSchema.optional(),
  referenceId: z.string().uuid().optional(),
  expiryDate: z.coerce.date().optional(),
});

export type CreateCostLayer = z.infer<typeof createCostLayerSchema>;

export const costLayerSchema = createCostLayerSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type CostLayer = z.infer<typeof costLayerSchema>;

/**
 * Cost layer row as returned from API (getInventoryItem, listCostLayers).
 * Matches Drizzle inventoryCostLayers.$inferSelect shape.
 */
export interface InventoryCostLayerRow {
  id: string;
  receivedAt: Date;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: string | number;
  referenceType: string | null;
  referenceId: string | null;
  expiryDate: Date | null;
  costComponents?: InventoryCostLayerCostComponent[];
}

export interface InventoryCostLayerCostComponent {
  id: string;
  componentType: 'base_unit_cost' | 'allocated_additional_cost';
  costType: string | null;
  quantityBasis: number;
  amountTotal: number;
  amountPerUnit: number;
  currency: string;
  exchangeRate: number | null;
  metadata: FlexibleJson | null;
}

export const costLayerFilterSchema = filterSchema.extend({
  inventoryId: z.string().uuid().optional(),
  hasRemaining: z.coerce.boolean().optional(),
});

export type CostLayerFilter = z.infer<typeof costLayerFilterSchema>;

// ============================================================================
// INVENTORY FORECASTS
// ============================================================================

export const createForecastSchema = z.object({
  productId: z.string().uuid('Product is required'),
  forecastDate: z.coerce.date(),
  forecastPeriod: forecastIntervalSchema,
  demandQuantity: z.coerce.number().min(0),
  forecastAccuracy: z.coerce.number().min(0).max(100).optional(),
  confidenceLevel: z.coerce.number().min(0).max(100).optional(),
  safetyStockLevel: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  recommendedOrderQuantity: z.number().int().min(0).optional(),
});

export type CreateForecast = z.infer<typeof createForecastSchema>;

export const updateForecastSchema = createForecastSchema.partial().omit({
  productId: true,
  forecastDate: true,
  forecastPeriod: true,
});

export type UpdateForecast = z.infer<typeof updateForecastSchema>;

export const forecastSchema = createForecastSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  calculatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type Forecast = z.infer<typeof forecastSchema>;

export const forecastFilterSchema = filterSchema.extend({
  productId: z.string().uuid().optional(),
  forecastPeriod: forecastIntervalSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ForecastFilter = z.infer<typeof forecastFilterSchema>;

export const forecastListQuerySchema = paginationSchema.merge(forecastFilterSchema);
export type ForecastListQuery = z.infer<typeof forecastListQuerySchema>;

// ============================================================================
// INVENTORY ALERTS
// ============================================================================

export const alertThresholdSchema = z
  .object({
    minQuantity: z.number().int().min(0).optional(),
    maxQuantity: z.number().int().min(0).optional(),
    daysBeforeExpiry: z.number().int().min(0).optional(),
    daysWithoutMovement: z.number().int().min(0).optional(),
    deviationPercentage: z.number().min(0).max(100).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE §4
export type AlertThreshold = FlexibleJson;

export const createAlertSchema = z.object({
  alertType: inventoryAlertTypeSchema,
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  threshold: alertThresholdSchema,
  isActive: z.boolean().default(true),
  notificationChannels: z.array(z.string()).default([]),
  escalationUsers: z.array(z.string().uuid()).default([]),
});

export type CreateAlert = z.infer<typeof createAlertSchema>;

export const updateAlertSchema = createAlertSchema.partial().omit({
  alertType: true,
});

export type UpdateAlert = z.infer<typeof updateAlertSchema>;

export const alertSchema = createAlertSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  lastTriggeredAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  version: z.number(),
});

export type Alert = z.infer<typeof alertSchema>;

export const alertFilterSchema = filterSchema.extend({
  alertType: inventoryAlertTypeSchema.optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  triggered: z.coerce.boolean().optional(),
});

export type AlertFilter = z.infer<typeof alertFilterSchema>;

export const alertListQuerySchema = paginationSchema.merge(alertFilterSchema);
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;

// ============================================================================
// TRIGGERED ALERTS
// ============================================================================

/**
 * Triggered alert as returned from getTriggeredAlerts server function
 * Note: This represents a real-time computed alert, not a stored record
 */
export interface TriggeredAlertResult {
  alert: Alert;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode?: string;
  } | null;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    inventoryId: string;
    productName: string;
    quantity: number;
  }>;
  isFallback?: boolean; // Flag to distinguish fallback alerts from real alert rules
}

/**
 * List triggered alerts result
 */
export interface ListTriggeredAlertsResult {
  alerts: TriggeredAlertResult[];
  count: number;
}

// ============================================================================
// PARAMS
// ============================================================================

export const stockCountParamsSchema = idParamSchema;
export type StockCountParams = z.infer<typeof stockCountParamsSchema>;

export const stockCountItemParamsSchema = z.object({
  countId: z.string().uuid(),
  itemId: z.string().uuid(),
});
export type StockCountItemParams = z.infer<typeof stockCountItemParamsSchema>;

export const costLayerParamsSchema = idParamSchema;
export type CostLayerParams = z.infer<typeof costLayerParamsSchema>;

export const forecastParamsSchema = idParamSchema;
export type ForecastParams = z.infer<typeof forecastParamsSchema>;

export const alertParamsSchema = idParamSchema;
export type AlertParams = z.infer<typeof alertParamsSchema>;

// ============================================================================
// INVENTORY VALUATION
// ============================================================================

export const inventoryValuationQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  valuationMethod: z.enum(['fifo', 'weighted_average']).default('fifo'),
});

export type InventoryValuationQuery = z.infer<typeof inventoryValuationQuerySchema>;

export const cogsCalculationSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  simulate: z.coerce.boolean().default(true),
});

export type COGSCalculationInput = z.infer<typeof cogsCalculationSchema>;

export const inventoryAgingQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  ageBuckets: z.array(z.number().int().positive()).default([30, 60, 90, 180, 365]),
});

export type InventoryAgingQuery = z.infer<typeof inventoryAgingQuerySchema>;

export const inventoryTurnoverQuerySchema = z.object({
  period: z.enum(['30d', '90d', '365d']).default('365d'),
  productId: z.string().uuid().optional(),
});

export type InventoryTurnoverQuery = z.infer<typeof inventoryTurnoverQuerySchema>;

export const inventoryFinanceIntegrityQuerySchema = z.object({
  valueDriftTolerance: z.coerce.number().nonnegative().default(0.01),
  topDriftLimit: z.coerce.number().int().min(1).max(100).default(25),
});

export type InventoryFinanceIntegrityQuery = z.infer<typeof inventoryFinanceIntegrityQuerySchema>;

export const inventoryFinanceReconcileSchema = z.object({
  dryRun: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
});

export type InventoryFinanceReconcileInput = z.infer<typeof inventoryFinanceReconcileSchema>;

// ============================================================================
// VALUATION RESPONSE TYPES
// ============================================================================

/**
 * Category valuation breakdown
 */
export interface CategoryValuation {
  categoryId: string;
  categoryName: string;
  totalValue: number;
  totalUnits: number;
  percentOfTotal: number;
  skuCount: number;
}

/**
 * Location valuation breakdown
 */
export interface LocationValuation {
  locationId: string;
  locationCode: string;
  locationName: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentOfTotal: number;
  utilization: number;
}

/**
 * Product valuation breakdown
 */
export interface ProductValuation {
  productId: string;
  productSku: string;
  productName: string;
  totalQuantity: number;
  weightedAverageCost: number;
  totalValue: number;
  costLayers: number;
}

/**
 * Complete inventory valuation result
 */
export interface InventoryValuationResult {
  totalValue: number;
  totalSkus: number;
  totalUnits: number;
  averageUnitCost: number;
  byCategory: CategoryValuation[];
  byLocation: LocationValuation[];
  byProduct: ProductValuation[];
  valuationMethod: string;
  asOf: string;
  financeIntegrity?: InventoryFinanceIntegritySummary;
}

export interface InventoryFinanceDriftItem {
  inventoryId: string;
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  inventoryValue: number;
  layerValue: number;
  absoluteDrift: number;
}

export interface InventoryFinanceIntegritySummary {
  status: 'green' | 'amber' | 'red';
  stockWithoutActiveLayers: number;
  inventoryValueMismatchCount: number;
  totalAbsoluteValueDrift: number;
  negativeOrOverconsumedLayers: number;
  duplicateActiveSerializedAllocations: number;
  shipmentLinkStatusMismatch: number;
  topDriftItems: InventoryFinanceDriftItem[];
  asOf: string;
}

export interface InventoryFinanceReconcileResult {
  dryRun: boolean;
  scannedInventoryRows: number;
  repairedMissingLayers: number;
  repairedValueDriftRows: number;
  clampedInvalidLayers: number;
  remainingMismatches: number;
  postIntegrity: InventoryFinanceIntegritySummary;
}

// ============================================================================
// TURNOVER RESPONSE TYPES
// ============================================================================

/**
 * Product turnover metrics
 */
export interface ProductTurnover {
  productId: string;
  productSku: string;
  productName: string;
  inventoryValue: number;
  periodCOGS: number;
  turnoverRate: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}

/**
 * Turnover trend data point
 */
export interface TurnoverTrendData {
  period: string;
  turnoverRate: number;
  daysOnHand: number;
}

/**
 * Turnover metrics result
 */
export interface InventoryTurnoverResult {
  turnover: {
    period: '30d' | '90d' | '365d';
    periodDays: number;
    cogsForPeriod: number;
    averageInventoryValue: number;
    annualizedCOGS: number;
    turnoverRate: number;
    daysOnHand: number;
  };
  byProduct: ProductTurnover[];
  trends: TurnoverTrendData[];
  benchmarks: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

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

/**
 * Aggregated aging item for product+location grouping
 */
export interface AggregatedAgingItem {
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationName: string;
  totalQuantity: number;
  totalValue: number;
  weightedAverageCost: number;
  oldestReceivedAt: Date;
  highestRisk: 'low' | 'medium' | 'high' | 'critical';
  ageInDays: number;
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
// WAREHOUSE LOCATIONS
// ============================================================================

export const locationTypeSchema = z.enum(['warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin']);

export type LocationType = z.infer<typeof locationTypeSchema>;

export const warehouseLocationListQuerySchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  locationType: locationTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type WarehouseLocationListQuery = z.infer<typeof warehouseLocationListQuerySchema>;

export const createWarehouseLocationSchema = z.object({
  locationCode: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  locationType: locationTypeSchema,
  parentId: z.string().uuid().optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  isPickable: z.boolean().default(true),
  isReceivable: z.boolean().default(true),
  attributes: z.record(z.string(), z.any()).optional(),
});

export type CreateWarehouseLocationInput = z.infer<typeof createWarehouseLocationSchema>;

export const updateWarehouseLocationSchema = createWarehouseLocationSchema.partial().omit({
  locationCode: true,
});

export type UpdateWarehouseLocationInput = z.infer<typeof updateWarehouseLocationSchema>;

export const warehouseLocationSchema = createWarehouseLocationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type WarehouseLocation = z.infer<typeof warehouseLocationSchema>;

// ============================================================================
// LOCATION API RESPONSE TYPES
// ============================================================================

/**
 * Simple location record from database (warehouse_locations table)
 * Used by listLocations, getLocation server functions
 */
export interface LocationApiRecord {
  id: string;
  organizationId: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  capacity: number | null;
  isActive: boolean;
  isPickable: boolean;
  isReceivable: boolean;
  attributes: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Result from listLocations server function
 */
export interface ListLocationsApiResult {
  locations: LocationApiRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Location with inventory contents from getLocation server function
 */
export interface LocationDetailApiResult {
  location: LocationApiRecord;
  contents: Array<{
    id: string;
    organizationId: string;
    productId: string;
    locationId: string;
    quantityOnHand: number;
    quantityAllocated: number;
    quantityAvailable: number;
    unitCost: number;
    totalValue: number;
    lotNumber: string | null;
    serialNumber: string | null;
    expiryDate: string | null;
    createdAt: Date;
    updatedAt: Date;
    product?: {
      id: string;
      name: string;
      sku: string;
    } | null;
  }>;
  metrics: {
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  };
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

// ============================================================================
// HOOK LOCATION TYPES
// ============================================================================

/**
 * Transformed warehouse location used by useLocations hook
 * This is the API response mapped through mapLocationFromApi helper
 */
export interface HookWarehouseLocation {
  id: string;
  code: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  parentPath: string[];
  capacity: number | null;
  currentOccupancy: number;
  utilization: number;
  isActive: boolean;
  attributes: FlexibleJson;
  childCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location hierarchy node with children
 */
export interface HookLocationHierarchy extends HookWarehouseLocation {
  children: HookLocationHierarchy[];
}

/**
 * Location contents from inventory query
 */
export interface HookLocationContents {
  items: Array<{
    inventoryId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    totalValue: number;
  }>;
  totalItems: number;
  totalValue: number;
  utilization: number;
}

/**
 * Filters for location queries in hooks
 * Extends Record for compatibility with queryKeys.locations.list()
 */
export interface HookLocationFilters extends Record<string, unknown> {
  parentId?: string;
  type?: LocationType;
  active?: boolean;
  search?: string;
}

/**
 * Create location input for hooks
 */
export interface CreateLocationInput {
  code: string;
  name: string;
  locationType: LocationType;
  parentId?: string;
  capacity?: number;
  attributes?: FlexibleJson;
}

/**
 * Update location input for hooks
 */
export interface UpdateLocationInput {
  code?: string;
  name?: string;
  capacity?: number;
  isActive?: boolean;
  attributes?: FlexibleJson;
}

// ============================================================================
// CLIENT-SAFE TYPE DEFINITIONS
// (Duplicated from drizzle schema to avoid client/server bundling issues)
// ============================================================================

/**
 * Inventory alert entity.
 * Client-safe version of InventoryAlert from drizzle/schema.
 */
export interface InventoryAlert {
  id: string;
  organizationId: string;
  alertType: 'low_stock' | 'overstock' | 'reorder_point' | 'expiring_soon' | 'slow_moving';
  productId: string | null;
  locationId: string | null;
  threshold: AlertThreshold;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

// ============================================================================
// SERVER FUNCTION RESPONSE TYPES
// ============================================================================

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

/**
 * COGS calculation result
 */
export interface COGSResult {
  cogs: number;
  costLayers: Array<{
    id: string;
    inventoryId: string;
    receivedAt: Date;
    quantityReceived: number;
    quantityRemaining: number;
    unitCost: number;
    referenceType: string | null;
    referenceId: string | null;
  }>;
  remainingLayers: Array<{
    id: string;
    inventoryId: string;
    receivedAt: Date;
    quantityReceived: number;
    quantityRemaining: number;
    unitCost: number;
    referenceType: string | null;
    referenceId: string | null;
  }>;
}

/**
 * Reorder recommendation for forecasting
 */
export interface ReorderRecommendation {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  daysUntilStockout: number | null;
  locationCount?: number;
  locations?: Array<{
    locationId: string;
    locationName: string;
    locationCode: string | null;
    quantityOnHand: number;
    quantityAvailable: number;
  }>;
}

/**
 * Forecast list result
 */
export interface ListForecastsResult {
  forecasts: Array<{
    id: string;
    organizationId: string;
    productId: string;
    forecastDate: string;
    forecastPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    demandQuantity: string;
    forecastAccuracy: string | null;
    confidenceLevel: string | null;
    safetyStockLevel: number | null;
    reorderPoint: number | null;
    recommendedOrderQuantity: number | null;
    calculatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Alert with product and location details
 */
export interface AlertWithDetails {
  id: string;
  organizationId: string;
  alertType: string;
  productId: string | null;
  locationId: string | null;
  threshold: FlexibleJson;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  } | null;
}

/**
 * Triggered alert with current values and severity
 */
export interface TriggeredAlert {
  alert: {
    id: string;
    organizationId: string;
    alertType: string;
    productId: string | null;
    locationId: string | null;
    threshold: FlexibleJson;
    isActive: boolean;
    notificationChannels: string[] | null;
    escalationUsers: string[] | null;
    lastTriggeredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    version: number;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  } | null;
  currentValue: number;
  thresholdValue: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affectedItems: Array<{
    inventoryId: string;
    productName: string;
    quantity: number;
  }>;
  isFallback?: boolean;
}

/** Alert item as returned in ListAlertsResult.alerts */
export interface AlertListItem {
  id: string;
  organizationId: string;
  alertType: string;
  productId: string | null;
  locationId: string | null;
  threshold: FlexibleJson;
  isActive: boolean;
  notificationChannels: string[] | null;
  escalationUsers: string[] | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

/**
 * Alert list result
 */
export interface ListAlertsResult {
  alerts: AlertListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  activeCount: number;
}

/**
 * Warehouse location with children (hierarchy)
 */
export interface WarehouseLocationWithChildren {
  id: string;
  organizationId: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  capacity: number | null;
  isActive: boolean;
  isPickable: boolean;
  isReceivable: boolean;
  attributes: FlexibleJson | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  children: WarehouseLocationWithChildren[];
  inventoryCount?: number;
  utilization?: number;
}

/**
 * Location list result
 */
export interface ListLocationsResult {
  locations: Array<{
    id: string;
    organizationId: string;
    locationCode: string;
    name: string;
    locationType: LocationType;
    parentId: string | null;
    capacity: number | null;
    isActive: boolean;
    isPickable: boolean;
    isReceivable: boolean;
    attributes: FlexibleJson | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

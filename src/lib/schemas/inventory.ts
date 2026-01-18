/**
 * Inventory Zod Schemas
 *
 * Validation schemas for inventory, locations, and movements.
 */

import { z } from "zod";
import {
  addressSchema,
  currencySchema,
  quantitySchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from "./patterns";

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const inventoryStatusValues = [
  "available",
  "allocated",
  "sold",
  "damaged",
  "returned",
  "quarantined",
] as const;

export const movementTypeValues = [
  "receive",
  "allocate",
  "deallocate",
  "pick",
  "ship",
  "adjust",
  "return",
  "transfer",
] as const;

export const inventoryStatusSchema = z.enum(inventoryStatusValues);
export const movementTypeSchema = z.enum(movementTypeValues);

// ============================================================================
// LOCATION ADDRESS
// ============================================================================

export const locationAddressSchema = addressSchema.partial();

export type LocationAddress = z.infer<typeof locationAddressSchema>;

// ============================================================================
// CREATE LOCATION
// ============================================================================

export const createLocationSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(255),
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

export const locationListQuerySchema =
  paginationSchema.merge(locationFilterSchema);

export type LocationListQuery = z.infer<typeof locationListQuerySchema>;

// ============================================================================
// INVENTORY (Stock Level)
// ============================================================================

export const inventorySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: inventoryStatusSchema,
  quantityOnHand: z.number(),
  quantityAllocated: z.number(),
  quantityAvailable: z.number(),
  unitCost: z.number(),
  totalValue: z.number(),
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

export const inventoryFilterSchema = filterSchema.extend({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: inventoryStatusSchema.optional(),
  lowStock: z.coerce.boolean().optional(), // Below reorder point
});

export type InventoryFilter = z.infer<typeof inventoryFilterSchema>;

// ============================================================================
// INVENTORY LIST QUERY
// ============================================================================

export const inventoryListQuerySchema =
  paginationSchema.merge(inventoryFilterSchema);

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

export type MovementMetadata = z.infer<typeof movementMetadataSchema>;

// ============================================================================
// CREATE INVENTORY MOVEMENT
// ============================================================================

export const createMovementSchema = z.object({
  productId: z.string().uuid("Product is required"),
  locationId: z.string().uuid("Location is required"),
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
  previousQuantity: z.number(),
  newQuantity: z.number(),
  totalCost: z.number(),
  createdAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
});

export type Movement = z.infer<typeof movementSchema>;

// ============================================================================
// MOVEMENT FILTERS
// ============================================================================

export const movementFilterSchema = filterSchema.extend({
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

export const movementListQuerySchema =
  paginationSchema.merge(movementFilterSchema);

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
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustmentQty: z.number(), // Positive or negative
  reason: z.string().min(1, "Reason is required").max(500),
  notes: z.string().max(500).optional(),
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

// ============================================================================
// STOCK TRANSFER
// ============================================================================

export const stockTransferSchema = z.object({
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: quantitySchema,
  notes: z.string().max(500).optional(),
});

export type StockTransfer = z.infer<typeof stockTransferSchema>;

// ============================================================================
// WAREHOUSE MANAGEMENT ENUMS
// ============================================================================

export const stockCountStatusValues = [
  "draft",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const stockCountTypeValues = [
  "full",
  "cycle",
  "spot",
  "annual",
] as const;

export const inventoryAlertTypeValues = [
  "low_stock",
  "out_of_stock",
  "overstock",
  "expiry",
  "slow_moving",
  "forecast_deviation",
] as const;

export const forecastIntervalValues = [
  "daily",
  "weekly",
  "monthly",
] as const;

export const qualityStatusValues = [
  "good",
  "damaged",
  "expired",
  "quarantined",
] as const;

export const costLayerReferenceTypeValues = [
  "purchase_order",
  "adjustment",
  "transfer",
] as const;

export const stockCountStatusSchema = z.enum(stockCountStatusValues);
export const stockCountTypeSchema = z.enum(stockCountTypeValues);
export const inventoryAlertTypeSchema = z.enum(inventoryAlertTypeValues);
export const forecastIntervalSchema = z.enum(forecastIntervalValues);
export const qualityStatusSchema = z.enum(qualityStatusValues);
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

export type StockCountMetadata = z.infer<typeof stockCountMetadataSchema>;

export const createStockCountSchema = z.object({
  countCode: z.string().min(1, "Count code is required").max(20),
  countType: stockCountTypeSchema.default("cycle"),
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
  inventoryId: z.string().uuid("Inventory item is required"),
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

// ============================================================================
// INVENTORY COST LAYERS
// ============================================================================

export const createCostLayerSchema = z.object({
  inventoryId: z.string().uuid("Inventory item is required"),
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

export const costLayerFilterSchema = filterSchema.extend({
  inventoryId: z.string().uuid().optional(),
  hasRemaining: z.coerce.boolean().optional(),
});

export type CostLayerFilter = z.infer<typeof costLayerFilterSchema>;

// ============================================================================
// INVENTORY FORECASTS
// ============================================================================

export const createForecastSchema = z.object({
  productId: z.string().uuid("Product is required"),
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

export type AlertThreshold = z.infer<typeof alertThresholdSchema>;

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

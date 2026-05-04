import { z } from 'zod';
import {
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
  type FlexibleJson,
} from '../_shared/patterns';

// ============================================================================
// INVENTORY COST LAYERS
// ============================================================================

export const costLayerReferenceTypeValues = ['purchase_order', 'adjustment', 'transfer', 'rma'] as const;

export const costLayerReferenceTypeSchema = z.enum(costLayerReferenceTypeValues);

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

export const costLayerParamsSchema = idParamSchema;
export type CostLayerParams = z.infer<typeof costLayerParamsSchema>;

// ============================================================================
// INVENTORY VALUATION
// ============================================================================

export const inventoryValuationQuerySchema = normalizeObjectInput(
  z.object({
    locationId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    valuationMethod: z.enum(['fifo', 'weighted_average']).default('fifo'),
  })
);

export type InventoryValuationQuery = z.infer<typeof inventoryValuationQuerySchema>;

export const cogsCalculationSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  simulate: z.coerce.boolean().default(true),
});

export type COGSCalculationInput = z.infer<typeof cogsCalculationSchema>;

export const inventoryAgingQuerySchema = normalizeObjectInput(
  z.object({
    locationId: z.string().uuid().optional(),
    ageBuckets: z.array(z.number().int().positive()).default([30, 60, 90, 180, 365]),
  })
);

export type InventoryAgingQuery = z.infer<typeof inventoryAgingQuerySchema>;

export const inventoryTurnoverQuerySchema = normalizeObjectInput(
  z.object({
    period: z.enum(['30d', '90d', '365d']).default('365d'),
    productId: z.string().uuid().optional(),
  })
);

export type InventoryTurnoverQuery = z.infer<typeof inventoryTurnoverQuerySchema>;

export const inventoryFinanceIntegrityQuerySchema = normalizeObjectInput(
  z.object({
    valueDriftTolerance: z.coerce.number().nonnegative().default(0.01),
    topDriftLimit: z.coerce.number().int().min(1).max(100).default(25),
  })
);

export type InventoryFinanceIntegrityQuery = z.infer<typeof inventoryFinanceIntegrityQuerySchema>;

export const inventoryFinanceReconcileSchema = normalizeObjectInput(
  z.object({
    dryRun: z.coerce.boolean().default(true),
    limit: z.coerce.number().int().min(1).max(5000).default(1000),
  })
);

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

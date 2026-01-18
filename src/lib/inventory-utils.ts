/**
 * Inventory Utilities
 *
 * Pure utility functions for inventory calculations and transformations.
 *
 * Features:
 * - FIFO cost calculations
 * - Stock status determination
 * - Value formatting
 * - Aging analysis helpers
 * - Reorder point calculations
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CostLayer {
  id: string;
  receivedAt: Date;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
}

export interface StockStatus {
  status: "in_stock" | "low_stock" | "out_of_stock" | "overstocked";
  message: string;
  severity: "success" | "warning" | "error" | "info";
}

export interface AgeAnalysis {
  bucket: string;
  minDays: number;
  maxDays: number | null;
  quantity: number;
  value: number;
  risk: "low" | "medium" | "high" | "critical";
}

export interface ReorderAnalysis {
  shouldReorder: boolean;
  urgency: "critical" | "high" | "medium" | "low" | "none";
  recommendedQuantity: number;
  daysUntilStockout: number | null;
  message: string;
}

// ============================================================================
// FIFO COST CALCULATIONS
// ============================================================================

/**
 * Calculate COGS using FIFO method.
 * Returns the cost and updated cost layers.
 */
export function calculateFIFOCost(
  layers: CostLayer[],
  quantityToIssue: number
): { cogs: number; updatedLayers: CostLayer[]; shortfall: number } {
  let remainingQty = quantityToIssue;
  let totalCost = 0;
  const updatedLayers: CostLayer[] = [];

  // Sort by received date (oldest first)
  const sortedLayers = [...layers].sort(
    (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()
  );

  for (const layer of sortedLayers) {
    if (remainingQty <= 0) {
      // Keep remaining layers unchanged
      updatedLayers.push({ ...layer });
      continue;
    }

    if (layer.quantityRemaining <= 0) {
      updatedLayers.push({ ...layer });
      continue;
    }

    const qtyFromLayer = Math.min(remainingQty, layer.quantityRemaining);
    totalCost += qtyFromLayer * layer.unitCost;
    remainingQty -= qtyFromLayer;

    updatedLayers.push({
      ...layer,
      quantityRemaining: layer.quantityRemaining - qtyFromLayer,
    });
  }

  return {
    cogs: totalCost,
    updatedLayers,
    shortfall: remainingQty > 0 ? remainingQty : 0,
  };
}

/**
 * Calculate weighted average cost from cost layers.
 */
export function calculateWeightedAverageCost(layers: CostLayer[]): number {
  const totalQty = layers.reduce((sum, l) => sum + l.quantityRemaining, 0);
  if (totalQty === 0) return 0;

  const totalValue = layers.reduce(
    (sum, l) => sum + l.quantityRemaining * l.unitCost,
    0
  );

  return totalValue / totalQty;
}

/**
 * Calculate total inventory value from cost layers.
 */
export function calculateInventoryValue(layers: CostLayer[]): number {
  return layers.reduce(
    (sum, l) => sum + l.quantityRemaining * l.unitCost,
    0
  );
}

// ============================================================================
// STOCK STATUS
// ============================================================================

/**
 * Determine stock status based on quantity and thresholds.
 */
export function getStockStatus(
  quantityOnHand: number,
  quantityAllocated: number,
  reorderPoint: number,
  maxStock?: number
): StockStatus {
  const available = quantityOnHand - quantityAllocated;

  if (quantityOnHand <= 0) {
    return {
      status: "out_of_stock",
      message: "Out of stock",
      severity: "error",
    };
  }

  if (available <= 0) {
    return {
      status: "out_of_stock",
      message: "Fully allocated",
      severity: "error",
    };
  }

  if (quantityOnHand <= reorderPoint) {
    return {
      status: "low_stock",
      message: `Low stock (${quantityOnHand} on hand, reorder at ${reorderPoint})`,
      severity: "warning",
    };
  }

  if (maxStock !== undefined && quantityOnHand > maxStock) {
    return {
      status: "overstocked",
      message: `Overstocked (${quantityOnHand} on hand, max ${maxStock})`,
      severity: "info",
    };
  }

  return {
    status: "in_stock",
    message: `${available} available`,
    severity: "success",
  };
}

/**
 * Get stock level as percentage of reorder point.
 */
export function getStockLevelPercentage(
  quantityOnHand: number,
  reorderPoint: number,
  safetyStock: number
): number {
  const target = reorderPoint + safetyStock;
  if (target <= 0) return 100;
  return Math.min(100, (quantityOnHand / target) * 100);
}

// ============================================================================
// AGING ANALYSIS
// ============================================================================

/**
 * Standard age buckets for inventory aging analysis.
 */
export const DEFAULT_AGE_BUCKETS = [
  { label: "0-30 days", minDays: 0, maxDays: 30, risk: "low" as const },
  { label: "31-60 days", minDays: 31, maxDays: 60, risk: "medium" as const },
  { label: "61-90 days", minDays: 61, maxDays: 90, risk: "high" as const },
  { label: "90+ days", minDays: 91, maxDays: null, risk: "critical" as const },
];

/**
 * Calculate age in days from a date.
 */
export function calculateAge(date: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get risk level based on age.
 */
export function getAgeRisk(ageInDays: number): "low" | "medium" | "high" | "critical" {
  if (ageInDays <= 30) return "low";
  if (ageInDays <= 60) return "medium";
  if (ageInDays <= 90) return "high";
  return "critical";
}

/**
 * Analyze inventory aging from cost layers.
 */
export function analyzeAging(layers: CostLayer[]): AgeAnalysis[] {
  const bucketData = DEFAULT_AGE_BUCKETS.map((bucket) => ({
    ...bucket,
    quantity: 0,
    value: 0,
  }));

  layers.forEach((layer) => {
    if (layer.quantityRemaining <= 0) return;

    const age = calculateAge(layer.receivedAt);
    const value = layer.quantityRemaining * layer.unitCost;

    const bucket = bucketData.find(
      (b) => age >= b.minDays && (b.maxDays === null || age <= b.maxDays)
    );

    if (bucket) {
      bucket.quantity += layer.quantityRemaining;
      bucket.value += value;
    }
  });

  return bucketData.map((b) => ({
    bucket: b.label,
    minDays: b.minDays,
    maxDays: b.maxDays,
    quantity: b.quantity,
    value: b.value,
    risk: b.risk,
  }));
}

// ============================================================================
// REORDER CALCULATIONS
// ============================================================================

/**
 * Calculate reorder point based on demand and lead time.
 */
export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  return Math.ceil(averageDailyDemand * leadTimeDays + safetyStock);
}

/**
 * Calculate safety stock using service level factor.
 */
export function calculateSafetyStock(
  demandStdDev: number,
  leadTimeDays: number,
  serviceLevelFactor: number = 1.65 // ~95% service level
): number {
  return Math.ceil(serviceLevelFactor * demandStdDev * Math.sqrt(leadTimeDays));
}

/**
 * Calculate Economic Order Quantity (EOQ).
 */
export function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number
): number {
  if (holdingCostPerUnit <= 0) return annualDemand;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit));
}

/**
 * Analyze reorder need for an item.
 */
export function analyzeReorder(
  quantityOnHand: number,
  quantityAllocated: number,
  reorderPoint: number,
  averageDailyDemand: number,
  eoq: number = 0
): ReorderAnalysis {
  const available = quantityOnHand - quantityAllocated;
  const daysUntilStockout =
    averageDailyDemand > 0 ? available / averageDailyDemand : null;

  // Already at or below reorder point
  if (quantityOnHand <= reorderPoint) {
    const urgency =
      available <= 0
        ? "critical"
        : daysUntilStockout !== null && daysUntilStockout <= 3
          ? "critical"
          : daysUntilStockout !== null && daysUntilStockout <= 7
            ? "high"
            : "medium";

    return {
      shouldReorder: true,
      urgency,
      recommendedQuantity: eoq > 0 ? eoq : reorderPoint * 2,
      daysUntilStockout,
      message:
        urgency === "critical"
          ? "Immediate reorder required"
          : urgency === "high"
            ? "Reorder soon"
            : "Schedule reorder",
    };
  }

  // Above reorder point but declining
  if (daysUntilStockout !== null && daysUntilStockout <= 14) {
    return {
      shouldReorder: true,
      urgency: "low",
      recommendedQuantity: eoq > 0 ? eoq : reorderPoint,
      daysUntilStockout,
      message: "Consider placing order",
    };
  }

  return {
    shouldReorder: false,
    urgency: "none",
    recommendedQuantity: 0,
    daysUntilStockout,
    message: "Stock levels adequate",
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format currency value in AUD.
 */
export function formatCurrency(
  value: number,
  options: { decimals?: number; compact?: boolean } = {}
): string {
  const { decimals = 0, compact = false } = options;

  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format quantity with unit.
 */
export function formatQuantity(
  quantity: number,
  unit: string = "units"
): string {
  const formatted = quantity.toLocaleString();
  return quantity === 1 ? `${formatted} ${unit.replace(/s$/, "")}` : `${formatted} ${unit}`;
}

/**
 * Format percentage.
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format days with appropriate unit.
 */
export function formatDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month" : `${months} months`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate quantity for adjustment.
 */
export function validateAdjustmentQuantity(
  currentQuantity: number,
  adjustmentQuantity: number
): { valid: boolean; error?: string } {
  const newQuantity = currentQuantity + adjustmentQuantity;

  if (newQuantity < 0) {
    return {
      valid: false,
      error: `Cannot reduce by ${Math.abs(adjustmentQuantity)}. Only ${currentQuantity} available.`,
    };
  }

  return { valid: true };
}

/**
 * Validate transfer quantity.
 */
export function validateTransferQuantity(
  sourceQuantity: number,
  transferQuantity: number
): { valid: boolean; error?: string } {
  if (transferQuantity <= 0) {
    return { valid: false, error: "Transfer quantity must be positive" };
  }

  if (transferQuantity > sourceQuantity) {
    return {
      valid: false,
      error: `Cannot transfer ${transferQuantity}. Only ${sourceQuantity} available.`,
    };
  }

  return { valid: true };
}

export default {
  calculateFIFOCost,
  calculateWeightedAverageCost,
  calculateInventoryValue,
  getStockStatus,
  getStockLevelPercentage,
  calculateAge,
  getAgeRisk,
  analyzeAging,
  calculateReorderPoint,
  calculateSafetyStock,
  calculateEOQ,
  analyzeReorder,
  formatCurrency,
  formatQuantity,
  formatPercentage,
  formatDays,
  validateAdjustmentQuantity,
  validateTransferQuantity,
};

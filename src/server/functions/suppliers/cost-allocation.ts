/**
 * Cost Allocation Engine
 *
 * Pure functions for allocating additional PO costs across line items.
 * Supports four allocation methods: equal, by_value, by_weight, by_quantity.
 *
 * @see drizzle/schema/suppliers/purchase-order-costs.ts for allocation methods
 * @see src/lib/schemas/purchase-orders/po-costs.ts for shared types
 */

import type { AllocationItem, CostToAllocate, POCostEntry } from '@/lib/schemas/purchase-orders';

export type { AllocationItem, CostToAllocate, POCostEntry };

// ============================================================================
// ALLOCATION FUNCTIONS
// ============================================================================

/**
 * Allocate a cost across items using the specified method.
 * Returns a Map of itemId -> allocated amount.
 *
 * Handles edge cases:
 * - No items: returns empty map
 * - Zero total for proportional methods: falls back to equal allocation
 * - Rounding: ensures allocated amounts sum exactly to the cost amount
 */
export function allocateCosts(
  items: AllocationItem[],
  cost: CostToAllocate
): Map<string, number> {
  const result = new Map<string, number>();

  if (items.length === 0 || cost.amount === 0) {
    return result;
  }

  switch (cost.method) {
    case 'equal':
      return allocateEqual(items, cost.amount);
    case 'by_value':
      return allocateByValue(items, cost.amount);
    case 'by_weight':
      return allocateByWeight(items, cost.amount);
    case 'by_quantity':
      return allocateByQuantity(items, cost.amount);
    default:
      return allocateEqual(items, cost.amount);
  }
}

/**
 * Split cost evenly across all items.
 */
function allocateEqual(items: AllocationItem[], amount: number): Map<string, number> {
  const result = new Map<string, number>();
  const perItem = Math.floor((amount / items.length) * 100) / 100; // Round to 2dp
  let allocated = 0;

  for (let i = 0; i < items.length; i++) {
    if (i === items.length - 1) {
      // Last item gets the remainder to avoid rounding drift
      result.set(items[i].id, Math.round((amount - allocated) * 100) / 100);
    } else {
      result.set(items[i].id, perItem);
      allocated += perItem;
    }
  }

  return result;
}

/**
 * Allocate proportional to line item value (unitPrice * quantity).
 * Falls back to equal if all values are 0.
 */
function allocateByValue(items: AllocationItem[], amount: number): Map<string, number> {
  const totalValue = items.reduce((sum, item) => sum + item.lineTotal, 0);

  if (totalValue === 0) {
    return allocateEqual(items, amount);
  }

  return allocateProportional(items, amount, (item) => item.lineTotal / totalValue);
}

/**
 * Allocate proportional to product weight.
 * Falls back to equal if all weights are 0.
 */
function allocateByWeight(items: AllocationItem[], amount: number): Map<string, number> {
  const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);

  if (totalWeight === 0) {
    return allocateEqual(items, amount);
  }

  return allocateProportional(
    items,
    amount,
    (item) => (item.weight * item.quantity) / totalWeight
  );
}

/**
 * Allocate proportional to quantity ordered.
 * Falls back to equal if all quantities are 0.
 */
function allocateByQuantity(items: AllocationItem[], amount: number): Map<string, number> {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalQuantity === 0) {
    return allocateEqual(items, amount);
  }

  return allocateProportional(items, amount, (item) => item.quantity / totalQuantity);
}

/**
 * Generic proportional allocation with rounding correction.
 * The proportion function returns the fraction for each item (must sum to 1).
 */
function allocateProportional(
  items: AllocationItem[],
  amount: number,
  proportionFn: (item: AllocationItem) => number
): Map<string, number> {
  const result = new Map<string, number>();
  let allocated = 0;

  for (let i = 0; i < items.length; i++) {
    if (i === items.length - 1) {
      // Last item gets the remainder
      result.set(items[i].id, Math.round((amount - allocated) * 100) / 100);
    } else {
      const itemAmount = Math.floor(amount * proportionFn(items[i]) * 100) / 100;
      result.set(items[i].id, itemAmount);
      allocated += itemAmount;
    }
  }

  return result;
}

// ============================================================================
// BULK ALLOCATION (all costs for a PO at once)
// ============================================================================

/**
 * Allocate multiple costs across items and return per-item totals.
 * Returns a Map of itemId -> total allocated amount from all costs.
 */
export function allocateAllCosts(
  items: AllocationItem[],
  costs: POCostEntry[]
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const item of items) {
    totals.set(item.id, 0);
  }

  for (const cost of costs) {
    const allocated = allocateCosts(items, {
      amount: cost.amount,
      method: cost.allocationMethod,
    });

    for (const [itemId, amount] of allocated) {
      totals.set(itemId, (totals.get(itemId) ?? 0) + amount);
    }
  }

  return totals;
}

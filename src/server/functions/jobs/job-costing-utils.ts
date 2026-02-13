/**
 * Job Costing Calculation Utilities
 *
 * Pure functions for cost and profitability calculations.
 * job_materials.unit_cost and orders.total are stored in dollars.
 * Labor rate is stored in cents.
 *
 * @see job-costing.ts
 */

/**
 * Convert unit cost to dollars. job_materials.unit_cost is stored in dollars (no conversion).
 */
export function unitCostToDollars(unitCost: number | string | null): number {
  return Number(unitCost ?? 0);
}

/**
 * Get quoted amount from order total. orders.total is stored in dollars (no conversion).
 */
export function orderTotalToQuotedAmount(orderTotal: number | string | null): number {
  return orderTotal ? Number(orderTotal) : 0;
}

/**
 * Convert labor rate from cents to dollars per hour.
 */
export function laborRateCentsToHourlyRate(laborRateCents: number): number {
  return laborRateCents / 100;
}

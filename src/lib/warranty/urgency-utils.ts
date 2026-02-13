/**
 * Warranty Urgency Utilities
 *
 * Shared utilities for calculating warranty urgency levels based on expiry dates.
 * Used by both server functions and UI components.
 */

import type { WarrantyUrgencyLevel } from '@/lib/schemas/warranty/warranties';
import { getDaysUntilExpiry } from './date-utils';

/**
 * Determine urgency level based on days until expiry.
 *
 * Urgency levels:
 * - `urgent`: <= 7 days until expiry
 * - `warning`: <= 14 days until expiry
 * - `approaching`: <= 21 days until expiry
 * - `healthy`: > 21 days until expiry
 *
 * @param expiryDate - The warranty expiry date (Date or ISO string)
 * @param fromDate - Optional date to calculate from (defaults to today)
 * @returns Urgency level for the warranty
 *
 * @example
 * ```ts
 * const urgency = getWarrantyUrgencyLevel(warranty.expiryDate);
 * // Returns: 'urgent' | 'warning' | 'approaching' | 'healthy'
 * ```
 */
export function getWarrantyUrgencyLevel(
  expiryDate: Date | string,
  fromDate?: Date | string
): WarrantyUrgencyLevel {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate, fromDate);
  
  if (daysUntilExpiry <= 7) return 'urgent';
  if (daysUntilExpiry <= 14) return 'warning';
  if (daysUntilExpiry <= 21) return 'approaching';
  return 'healthy';
}

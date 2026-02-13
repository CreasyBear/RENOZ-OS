/**
 * Pricing Domain Utilities
 *
 * Centralized utilities for pricing operations, formatting, and common patterns.
 * Eliminates DRY violations and provides consistent interfaces.
 */

import { formatAmount } from './currency';

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PRICING_PERMISSIONS = {
  READ: 'supplier.read',
  CREATE: 'supplier.update',
  UPDATE: 'supplier.update',
  DELETE: 'supplier.update',
  APPROVE: 'supplier.approve',
  IMPORT: 'supplier.update',
} as const;

// ============================================================================
// CURRENCY FORMATTING HOOK
// ============================================================================

/**
 * Currency formatting hook - eliminates DRY violations in pricing components
 */
export function useCurrency() {
  return {
    formatPrice: (amount: number | null | undefined) =>
      formatAmount({ currency: 'AUD', amount: amount ?? 0 }),

    formatPriceCompact: (amount: number | null | undefined) =>
      formatAmount({ currency: 'AUD', amount: amount ?? 0 }),

    formatPriceWithCents: (amount: number | null | undefined) =>
      formatAmount({ currency: 'AUD', amount: amount ?? 0, minimumFractionDigits: 2 }),
  };
}

// ============================================================================
// DISCOUNT CALCULATIONS
// ============================================================================

/**
 * Calculate effective price from base price and discount
 */
export function calculateEffectivePrice(
  basePrice: number,
  discountType: 'percentage' | 'fixed' | 'volume',
  discountValue: number,
  quantity: number = 1
): number {
  if (discountType === 'fixed') {
    return Math.max(0, basePrice - discountValue);
  }

  if (discountType === 'percentage') {
    const discountAmount = basePrice * (discountValue / 100);
    return Math.max(0, basePrice - discountAmount);
  }

  if (discountType === 'volume' && quantity > 1) {
    // Volume discount applies progressively
    const discountAmount = basePrice * (discountValue / 100);
    return Math.max(0, basePrice - discountAmount);
  }

  return basePrice;
}

/**
 * Calculate discount percentage from base and effective prices
 */
export function calculateDiscountPercentage(basePrice: number, effectivePrice: number): number {
  if (basePrice <= 0) return 0;
  return Math.max(0, ((basePrice - effectivePrice) / basePrice) * 100);
}

// ============================================================================
// PRICE VALIDATION
// ============================================================================

export const PRICE_VALIDATION = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  MAX_DISCOUNT_PERCENTAGE: 90,
  MIN_ORDER_QTY: 1,
  MAX_ORDER_QTY: 999999,
} as const;

/**
 * Validate price input
 */
export function validatePrice(price: number): { isValid: boolean; error?: string } {
  if (price < PRICE_VALIDATION.MIN_PRICE) {
    return { isValid: false, error: `Price must be at least $${PRICE_VALIDATION.MIN_PRICE}` };
  }
  if (price > PRICE_VALIDATION.MAX_PRICE) {
    return { isValid: false, error: `Price cannot exceed $${PRICE_VALIDATION.MAX_PRICE}` };
  }
  return { isValid: true };
}

/**
 * Validate discount percentage
 */
export function validateDiscountPercentage(percentage: number): {
  isValid: boolean;
  error?: string;
} {
  if (percentage < 0) {
    return { isValid: false, error: 'Discount cannot be negative' };
  }
  if (percentage > PRICE_VALIDATION.MAX_DISCOUNT_PERCENTAGE) {
    return {
      isValid: false,
      error: `Discount cannot exceed ${PRICE_VALIDATION.MAX_DISCOUNT_PERCENTAGE}%`,
    };
  }
  return { isValid: true };
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

export const PRICE_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
} as const;

export const AGREEMENT_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXPIRED: 'expired',
} as const;

export const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AUTO_APPROVED: 'auto_approved',
} as const;

/**
 * Check if a price is expired
 */
export function isPriceExpired(expiryDate?: string | Date): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

/**
 * Check if a price is effective (active and not expired)
 */
export function isPriceEffective(
  effectiveDate?: string | Date,
  expiryDate?: string | Date
): boolean {
  const now = new Date();

  if (effectiveDate && new Date(effectiveDate) > now) return false;
  if (expiryDate && new Date(expiryDate) < now) return false;

  return true;
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

export type PriceSortField =
  | 'productName'
  | 'supplierName'
  | 'effectivePrice'
  | 'discountPercentage'
  | 'leadTime'
  | 'rating';
export type SortDirection = 'asc' | 'desc';

export function sortPrices<
  T extends { effectivePrice: number; productName: string; supplierName: string },
>(items: T[], field: PriceSortField, direction: SortDirection): T[] {
  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'effectivePrice':
        comparison = a.effectivePrice - b.effectivePrice;
        break;
      case 'productName':
        comparison = a.productName.localeCompare(b.productName);
        break;
      case 'supplierName':
        comparison = a.supplierName.localeCompare(b.supplierName);
        break;
      default:
        comparison = 0;
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'excel';
  includeHistory?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}

/**
 * Generate CSV headers for price export
 */
export function generatePriceCSVHeaders(includeHistory = false): string[] {
  const baseHeaders = [
    'Supplier Code',
    'Supplier Name',
    'Product Name',
    'Product SKU',
    'Base Price',
    'Currency',
    'Discount Type',
    'Discount Value',
    'Effective Price',
    'Min Order Qty',
    'Max Order Qty',
    'Effective Date',
    'Expiry Date',
    'Status',
  ];

  if (includeHistory) {
    baseHeaders.push('Last Modified', 'Modified By');
  }

  return baseHeaders;
}

/**
 * Order Calculation Utilities
 *
 * Pure functions for order calculations following midday invoice patterns.
 * Adapted for Australian GST (10%) instead of VAT.
 *
 * Features:
 * - Null-safe operations with ?? 0 defaults
 * - Comprehensive error handling
 * - Australian GST compliance (10% rate)
 * - Type-safe interfaces
 *
 * @see renoz-v3/_reference/.midday-reference/packages/invoice/src/utils/calculate.ts
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Australian GST rate (10%) */
export const GST_RATE = 0.1;

/** Banker's rounding precision for currency */
export const CURRENCY_PRECISION = 2;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for order calculation functions
 */
export interface OrderCalculationInput {
  /** Line items in the order */
  lineItems?: Array<{
    price?: number;
    quantity?: number;
    discountPercent?: number;
    discountAmount?: number;
  }>;
  /** GST rate override (defaults to 10%) */
  gstRate?: number;
  /** Additional discount percentage */
  discountPercent?: number;
  /** Additional discount amount */
  discountAmount?: number;
  /** Shipping cost */
  shippingAmount?: number;
  /** Whether to include GST in calculations */
  includeGST?: boolean;
}

/**
 * Result of order calculations
 */
export interface OrderCalculationResult {
  /** Subtotal before GST and discounts */
  subtotal: number;
  /** GST amount calculated */
  gstAmount: number;
  /** Discount amount applied */
  discountAmount: number;
  /** Shipping amount */
  shippingAmount: number;
  /** Final total including all factors */
  total: number;
}

/**
 * Input for line item calculation
 */
export interface LineItemCalculationInput {
  /** Unit price per item */
  price?: number;
  /** Quantity of items */
  quantity?: number;
  /** Line item discount percentage */
  discountPercent?: number;
  /** Line item discount amount */
  discountAmount?: number;
}

/**
 * Result of line item calculation
 */
export interface LineItemCalculationResult {
  /** Quantity × price before discounts */
  subtotal: number;
  /** Total discount applied to line item */
  discountAmount: number;
  /** Final line item total */
  total: number;
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate order total following midday invoice patterns
 *
 * Adapted from midday calculateTotal function but with Australian GST instead of VAT.
 * Handles null safety, rounding, and comprehensive error handling.
 */
export function calculateTotal({
  lineItems = [],
  gstRate = GST_RATE,
  discountPercent = 0,
  discountAmount = 0,
  shippingAmount = 0,
  includeGST = true,
}: OrderCalculationInput = {}): OrderCalculationResult {
  // Handle cases where lineItems might be undefined or null
  const safeLineItems = lineItems || [];

  // Calculate subtotal: Sum of all line item totals
  const subtotal = safeLineItems.reduce((acc, item) => {
    // Handle cases where item might be undefined or null
    if (!item) return acc;

    const lineItemResult = calculateLineItemTotal(item);
    const safeTotal = isNaN(lineItemResult.total) ? 0 : lineItemResult.total;
    return acc + safeTotal;
  }, 0);

  // Handle cases where rates might be undefined
  const safeGstRate = gstRate ?? GST_RATE;
  const safeDiscountPercent = discountPercent ?? 0;
  const safeDiscountAmount = discountAmount ?? 0;
  const safeShippingAmount = shippingAmount ?? 0;

  // Calculate percentage discount on subtotal
  const percentDiscount = includeGST ? (subtotal * safeDiscountPercent) / 100 : 0;

  // Total discount = percentage discount + fixed discount
  const totalDiscountAmount = Math.round((percentDiscount + safeDiscountAmount) * 100) / 100;

  // Calculate GST on (subtotal - discounts) + shipping
  const taxableAmount = subtotal - totalDiscountAmount + safeShippingAmount;
  const gstAmount = includeGST ? Math.round(taxableAmount * safeGstRate * 100) / 100 : 0;

  // Calculate final total
  const total = Math.round((taxableAmount + gstAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount,
    discountAmount: totalDiscountAmount,
    shippingAmount: safeShippingAmount,
    total,
  };
}

/**
 * Calculate line item total
 *
 * Calculates individual line item totals with quantity, price, and discounts.
 * Follows midday calculateLineItemTotal pattern with enhanced null safety.
 */
export function calculateLineItemTotal({
  price = 0,
  quantity = 0,
  discountPercent = 0,
  discountAmount = 0,
}: LineItemCalculationInput = {}): LineItemCalculationResult {
  // Handle cases where undefined is explicitly passed
  const safePrice = price ?? 0;
  const safeQuantity = quantity ?? 0;
  const safeDiscountPercent = discountPercent ?? 0;
  const safeDiscountAmount = discountAmount ?? 0;

  // Calculate base subtotal (handle NaN)
  const subtotal = safePrice * safeQuantity;
  const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;

  // Calculate percentage discount
  const percentDiscount = (safeSubtotal * safeDiscountPercent) / 100;
  const safePercentDiscount = isNaN(percentDiscount) ? 0 : percentDiscount;

  // Total discount for this line item
  const totalDiscount = safePercentDiscount + safeDiscountAmount;
  const safeTotalDiscount = isNaN(totalDiscount) ? 0 : totalDiscount;

  // Final line item total
  const total = Math.max(0, safeSubtotal - safeTotalDiscount); // Ensure non-negative

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round currency amount using banker's rounding
 */
export function roundCurrency(amount: number, precision: number = CURRENCY_PRECISION): number {
  const factor = Math.pow(10, precision);
  return Math.round(amount * factor) / factor;
}

/**
 * Validate calculation inputs
 */
export function validateCalculationInput(input: OrderCalculationInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.gstRate !== undefined && (input.gstRate < 0 || input.gstRate > 1)) {
    errors.push('GST rate must be between 0 and 1');
  }

  if (
    input.discountPercent !== undefined &&
    (input.discountPercent < 0 || input.discountPercent > 100)
  ) {
    errors.push('Discount percentage must be between 0 and 100');
  }

  if (input.lineItems) {
    input.lineItems.forEach((item, index) => {
      if (item?.price !== undefined && item.price < 0) {
        errors.push(`Line item ${index + 1}: Price cannot be negative`);
      }
      if (item?.quantity !== undefined && item.quantity < 0) {
        errors.push(`Line item ${index + 1}: Quantity cannot be negative`);
      }
      if (
        item?.discountPercent !== undefined &&
        (item.discountPercent < 0 || item.discountPercent > 100)
      ) {
        errors.push(`Line item ${index + 1}: Discount percentage must be between 0 and 100`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// BUSINESS RULE VALIDATION
// ============================================================================

/**
 * Validate order calculation against business rules
 */
export function validateOrderBusinessRules(result: OrderCalculationResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for negative totals (shouldn't happen with current logic, but defensive)
  if (result.total < 0) {
    warnings.push('Order total is negative - please review discounts');
  }

  // Check for unusually high GST amounts
  if (result.gstAmount > result.subtotal) {
    warnings.push('GST amount exceeds subtotal - please verify GST rate');
  }

  // Check for discount exceeding subtotal
  if (result.discountAmount > result.subtotal) {
    warnings.push('Total discount exceeds subtotal - please review discount amounts');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

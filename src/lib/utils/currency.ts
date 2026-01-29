/**
 * Currency Formatting Utility
 *
 * Simple wrapper for formatting currency values with AUD as default.
 */

/**
 * Format a number as currency (AUD by default)
 */
export function formatCurrency(amount: number, currency = 'AUD'): string {
  try {
    return Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback if currency code is invalid
    return Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

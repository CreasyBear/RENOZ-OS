/**
 * Currency Utilities - Gold Standard from Midday
 *
 * Safely normalizes currency codes to ISO 4217 format and handles formatting.
 * Extracts 3-letter ISO codes from strings, falls back to AUD if invalid.
 */

// ============================================================================
// CURRENCY NORMALIZATION
// ============================================================================

/**
 * Safely normalizes currency codes to ISO 4217 format
 * Extracts 3-letter ISO codes from strings, falls back to AUD if invalid
 */
export function normalizeCurrencyCode(currency: string | null | undefined): string {
  try {
    if (!currency) {
      return 'AUD';
    }

    if (typeof currency !== 'string') {
      return 'AUD';
    }

    const normalized = currency.trim().toUpperCase();

    if (!normalized) {
      return 'AUD';
    }

    // If it's already a valid ISO 4217 code (3 uppercase letters), use it
    if (/^[A-Z]{3}$/.test(normalized)) {
      return normalized;
    }

    // Try to extract 3-letter code from strings like "AU$" -> "AUD"
    // Remove all non-alphanumeric characters and look for 3-letter pattern
    const cleaned = normalized.replace(/[^A-Z0-9]/g, '');
    if (cleaned.length >= 3) {
      // Try to find a 3-letter ISO code pattern
      const match = cleaned.match(/[A-Z]{3}/);
      if (match) {
        const candidate = match[0];
        // Verify it's a known currency code
        if (SUPPORTED_CURRENCIES[candidate as keyof typeof SUPPORTED_CURRENCIES]) {
          return candidate;
        }
      }
    }

    // Default fallback
    return 'AUD';
  } catch (error) {
    console.warn(`Error normalizing currency code: ${currency}, falling back to AUD`, error);
    return 'AUD';
  }
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string | null;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

/**
 * Format currency amounts with proper error handling and fallbacks
 * Based on Midday's gold standard approach
 */
export function formatAmount({
  currency,
  amount,
  locale = 'en-AU',
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatAmountParams): string {
  if (!currency) {
    // Fallback to AUD formatting
    return Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }

  // Normalize currency code to ISO 4217 format
  const normalizedCurrency = normalizeCurrencyCode(currency);

  // Get currency info for proper locale
  const currencyInfo =
    SUPPORTED_CURRENCIES[normalizedCurrency as keyof typeof SUPPORTED_CURRENCIES];
  const safeLocale = currencyInfo?.locale ?? locale ?? 'en-AU';

  try {
    return Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch (error) {
    // Fallback to AUD if currency is invalid
    console.warn(
      `Invalid currency code: ${currency} (normalized to ${normalizedCurrency}), falling back to AUD`,
      error
    );
    return Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }
}

// ============================================================================
// CURRENCY CONSTANTS
// ============================================================================

export const SUPPORTED_CURRENCIES = {
  AUD: { symbol: '$', name: 'Australian Dollar', locale: 'en-AU' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

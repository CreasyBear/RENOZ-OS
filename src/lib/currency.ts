/**
 * Currency Utilities - Gold Standard from Midday
 *
 * Safely normalizes currency codes to ISO 4217 format and handles formatting.
 * Extracts 3-letter ISO codes from strings, falls back to AUD if invalid.
 */

import { logger } from '@/lib/logger';

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
    logger.warn('Error normalizing currency code', { currency, error: String(error) });
    return 'AUD';
  }
}

// ============================================================================
// MONEY UNIT HELPERS
// ============================================================================

/**
 * Monetary amounts are stored in dollars by default.
 * Use these helpers only for explicit cents fields (e.g. shipping_cost).
 */
export type MoneyDollars = number;
export type MoneyCents = number;

export function toCents(dollars: MoneyDollars): MoneyCents {
  return Math.round(dollars * 100);
}

export function fromCents(cents: MoneyCents): MoneyDollars {
  return cents / 100;
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string | null;
  numberFormat?: string | null; // Organization numberFormat: "1,234.56" | "1.234,56" | "1 234,56"
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  notation?: 'standard' | 'compact';
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
};

/**
 * Apply organization numberFormat to a formatted currency string
 */
function applyNumberFormat(
  formatted: string,
  numberFormat: string,
  hasDecimal: boolean
): string {
  // Extract the currency symbol and numeric part
  const symbolMatch = formatted.match(/^([^\d\s,.-]+)/) || formatted.match(/([^\d\s,.-]+)$/);
  const symbol = symbolMatch ? symbolMatch[1] : "";
  const numericPart = formatted.replace(/[^\d,.-]/g, "");

  // Parse numberFormat pattern
  let thousandsSep: string;
  let decimalSep: string;

  if (numberFormat === "1.234,56") {
    thousandsSep = ".";
    decimalSep = ",";
  } else if (numberFormat === "1 234,56") {
    thousandsSep = " ";
    decimalSep = ",";
  } else {
    // Default: "1,234.56"
    thousandsSep = ",";
    decimalSep = ".";
  }

  // Split into integer and decimal parts using last separator
  const lastComma = numericPart.lastIndexOf(",");
  const lastDot = numericPart.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const integerRaw = decimalIndex >= 0 ? numericPart.slice(0, decimalIndex) : numericPart;
  const decimalRaw = decimalIndex >= 0 ? numericPart.slice(decimalIndex + 1) : "";
  const integerPart = integerRaw.replace(/[.,\s]/g, "");
  const decimalPart = decimalRaw;

  // Apply thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

  // Reconstruct with proper separators
  const formattedNumeric =
    hasDecimal && decimalPart
      ? `${formattedInteger}${decimalSep}${decimalPart.padEnd(2, "0").slice(0, 2)}`
      : formattedInteger;

  // Reconstruct with currency symbol
  if (formatted.startsWith(symbol)) {
    return `${symbol}${formattedNumeric}`;
  } else {
    return `${formattedNumeric}${symbol}`;
  }
}

/**
 * Format currency amounts with proper error handling and fallbacks
 * Based on Midday's gold standard approach
 * Always shows cents (2 decimal places) unless explicitly overridden
 */
export function formatAmount({
  currency,
  amount,
  locale = 'en-AU',
  numberFormat,
  minimumFractionDigits = 2, // Always show cents by default
  maximumFractionDigits = 2,
  notation = 'standard',
  signDisplay = 'auto',
}: FormatAmountParams): string {
  if (!currency) {
    // Fallback to AUD formatting
    const formatted = Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
      signDisplay,
    }).format(amount);

    // Apply numberFormat if provided
    if (numberFormat && minimumFractionDigits > 0 && notation === 'standard') {
      return applyNumberFormat(formatted, numberFormat, true);
    }
    return formatted;
  }

  // Normalize currency code to ISO 4217 format
  const normalizedCurrency = normalizeCurrencyCode(currency);

  // Get currency info for proper locale
  const currencyInfo =
    SUPPORTED_CURRENCIES[normalizedCurrency as keyof typeof SUPPORTED_CURRENCIES];
  const safeLocale = currencyInfo?.locale ?? locale ?? 'en-AU';

  try {
    const formatted = Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
      signDisplay,
    }).format(amount);

    // Apply organization numberFormat if provided
    if (numberFormat && minimumFractionDigits > 0 && notation === 'standard') {
      return applyNumberFormat(formatted, numberFormat, true);
    }
    return formatted;
  } catch (error) {
    // Fallback to AUD if currency is invalid
    logger.warn('Invalid currency code, falling back to AUD', {
      currency,
      normalizedCurrency,
      error: String(error),
    });
    const formatted = Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
      signDisplay,
    }).format(amount);

    if (numberFormat && minimumFractionDigits > 0 && notation === 'standard') {
      return applyNumberFormat(formatted, numberFormat, true);
    }
    return formatted;
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

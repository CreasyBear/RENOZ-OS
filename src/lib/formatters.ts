/**
 * Formatting Utilities
 *
 * Common formatting functions for currency, dates, percentages, etc.
 * All currency values are assumed to be in dollars unless otherwise specified.
 */

/**
 * Format a number as currency.
 * Input is in dollars by default, output is formatted with $ and commas.
 *
 * @example
 * formatCurrency(125.00) // "$125.00"
 * formatCurrency(125.00, { currency: 'USD', locale: 'en-US' }) // "$125.00"
 *
 * @deprecated Use `useOrgFormat().formatCurrency` or `FormatAmount` for currency display.
 */
export function formatCurrency(
  value: number | null | undefined,
  options: {
    cents?: boolean; // If true, value is in cents (default: false)
    showCents?: boolean; // If true, show decimal places (default: true)
    currency?: string; // Currency code (default: 'AUD')
    locale?: string; // Locale for formatting (default: 'en-AU')
  } = {}
): string {
  const { cents = false, showCents = true, currency = 'AUD', locale = 'en-AU' } = options;

  if (value === null || value === undefined) {
    return "$0";
  }

  const dollarValue = cents ? value / 100 : value;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollarValue);
}

/**
 * Format a number as a compact currency (e.g., $12.5K, $1.2M).
 * Input is in dollars.
 *
 * @example
 * formatCurrencyCompact(12500) // "$12.5K"
 * formatCurrencyCompact(1250000) // "$1.25M"
 *
 * @deprecated Use `useOrgFormat().formatCurrency` with `{ compact: true }`.
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "$0";
  }

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format a percentage value.
 *
 * @example
 * formatPercentage(45.5) // "45.5%"
 * formatPercentage(100) // "100%"
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) {
    return "0%";
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date.
 *
 * @example
 * formatDate(new Date()) // "17 Jan 2026"
 * formatDate("2026-01-17", { locale: 'en-US' }) // "Jan 17, 2026"
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions & { locale?: string } = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  if (!date) return "";

  const { locale = 'en-AU', ...formatOptions } = options;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, formatOptions);
}

/**
 * Format a date as a relative time (e.g., "2 days ago", "in 3 hours").
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "1 day ago"
 */
export function formatRelativeTime(date: Date | string | null | undefined, locale = 'en-AU'): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return rtf.format(diffMinutes, "minute");
    }
    return rtf.format(diffHours, "hour");
  }

  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, "day");
  }

  if (Math.abs(diffDays) < 365) {
    return rtf.format(Math.round(diffDays / 30), "month");
  }

  return rtf.format(Math.round(diffDays / 365), "year");
}

/**
 * Format a number with commas for thousands.
 *
 * @example
 * formatNumber(12500) // "12,500"
 * formatNumber(12500, 'en-US') // "12,500"
 */
export function formatNumber(value: number | null | undefined, locale = 'en-AU'): string {
  if (value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formatting Utilities
 *
 * Common formatting functions for currency, dates, percentages, etc.
 * All currency values are assumed to be in AUD cents unless otherwise specified.
 */

/**
 * Format a number as Australian currency (AUD).
 * Input is in cents, output is formatted with $ and commas.
 *
 * @example
 * formatCurrency(12500) // "$125.00"
 * formatCurrency(1250000) // "$12,500.00"
 */
export function formatCurrency(
  value: number | null | undefined,
  options: {
    cents?: boolean; // If true, value is in cents (default: true)
    showCents?: boolean; // If true, show decimal places (default: false for whole dollars)
  } = {}
): string {
  const { cents = true, showCents = false } = options;

  if (value === null || value === undefined) {
    return "$0";
  }

  const dollarValue = cents ? value / 100 : value;

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollarValue);
}

/**
 * Format a number as a compact currency (e.g., $12.5K, $1.2M).
 * Input is in cents.
 *
 * @example
 * formatCurrencyCompact(1250000) // "$12.5K"
 * formatCurrencyCompact(125000000) // "$1.25M"
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "$0";
  }

  const dollarValue = value / 100;

  if (dollarValue >= 1000000) {
    return `$${(dollarValue / 1000000).toFixed(2)}M`;
  }
  if (dollarValue >= 1000) {
    return `$${(dollarValue / 1000).toFixed(1)}K`;
  }
  return `$${dollarValue.toFixed(0)}`;
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
 * Format a date in Australian format.
 *
 * @example
 * formatDate(new Date()) // "17 Jan 2026"
 * formatDate("2026-01-17") // "17 Jan 2026"
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", options);
}

/**
 * Format a date as a relative time (e.g., "2 days ago", "in 3 hours").
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "1 day ago"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat("en-AU", { numeric: "auto" });

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
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("en-AU").format(value);
}

/**
 * useOrgFormat Hook
 *
 * Provides formatting functions that use organization settings (currency, locale, timezone).
 * Similar pattern to lib/email/hooks/use-org-format.ts but for UI components.
 *
 * This hook uses the OrganizationSettingsContext to get the current organization's
 * settings and provides formatters for:
 * - Currency amounts
 * - Dates and times
 * - Numbers
 *
 * @example
 * ```tsx
 * function InvoiceTable({ invoice }) {
 *   const { formatCurrency, formatDate, formatNumber } = useOrgFormat();
 *
 *   return (
 *     <tr>
 *       <td>{formatDate(invoice.createdAt)}</td>
 *       <td>{formatCurrency(invoice.amount)}</td>
 *       <td>{formatNumber(invoice.quantity)}</td>
 *     </tr>
 *   );
 * }
 * ```
 */

import { useCallback, useMemo } from "react";
import { useOrganizationSettings } from "~/contexts/organization-settings-context";
import { formatAmount } from "@/lib/currency";

/**
 * Options for currency formatting
 */
interface FormatCurrencyOptions {
  /** Override currency code (defaults to org currency) */
  currency?: string;
  /** Override locale (defaults to org locale) */
  locale?: string;
  /** Whether amount is in cents (default: false - amounts are in dollars) */
  cents?: boolean;
  /** Use compact notation for large numbers */
  compact?: boolean;
  /** Show decimal places (default: true - always show cents) */
  showCents?: boolean;
  /** Show +/- sign */
  showSign?: boolean;
}

/**
 * Options for date formatting
 */
interface FormatDateOptions {
  /** Override locale (defaults to org locale) */
  locale?: string;
  /** Override timezone (defaults to org timezone) */
  timezone?: string;
  /** Date format style or pattern */
  format?: "short" | "medium" | "long" | "full" | "iso" | "relative";
  /** Include time in output */
  includeTime?: boolean;
  /** Time format style (only used if includeTime is true) */
  timeFormat?: "12h" | "24h";
}

/**
 * Options for number formatting
 */
interface FormatNumberOptions {
  /** Override locale (defaults to org locale) */
  locale?: string;
  /** Decimal places (default: 0) */
  decimals?: number;
  /** Include thousand separators */
  useGrouping?: boolean;
}

/**
 * Hook that provides formatting functions using organization settings
 *
 * Returns formatters for currency, dates, and numbers that automatically
 * use the organization's configured locale, currency, and timezone.
 *
 * @example
 * ```tsx
 * const {
 *   formatCurrency,    // (amount, options?) => string
 *   formatDate,        // (date, options?) => string
 *   formatNumber,      // (value, options?) => string
 *   formatPercent,     // (value, options?) => string
 *   settings,          // Raw settings object
 * } = useOrgFormat();
 *
 * // Currency formatting (amounts are in dollars by default)
 * formatCurrency(125.00);           // "$125.00" (assuming AUD)
 * formatCurrency(125.00, { compact: true });  // "$125"
 * formatCurrency(12500.00);   // "$12,500.00"
 * formatCurrency(125.00, { currency: 'USD' }); // "$125.00" USD
 *
 * // Date formatting
 * formatDate(new Date());          // "15/01/2026" (assuming en-AU)
 * formatDate(date, { format: 'long' });      // "15 January 2026"
 * formatDate(date, { includeTime: true });  // "15/01/2026, 2:30 pm"
 *
 * // Number formatting
 * formatNumber(1234.56);           // "1,234.56"
 * formatNumber(1234.56, { decimals: 1 });   // "1,234.6"
 *
 * // Percent formatting
 * formatPercent(12.5);             // "12.5%"
 * formatPercent(0.125, { decimals: 1 });    // "12.5%"
 * ```
 */
export function useOrgFormat() {
  const settings = useOrganizationSettings();

  const {
    currency: orgCurrency,
    locale: orgLocale,
    timezone: orgTimezone,
    dateFormat: orgDateFormat,
    numberFormat: orgNumberFormat,
  } = settings;

  /**
   * Format a currency amount
   * Amounts are in dollars by default, always shows cents unless compact notation
   */
  const formatCurrency = useCallback(
    (amount: number | null | undefined, options: FormatCurrencyOptions = {}) => {
      if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return "—";
      }

      const {
        currency = orgCurrency,
        locale = orgLocale,
        cents = false, // Default to dollars
        compact = false,
        showCents = true, // Always show cents by default
        showSign = false,
      } = options;

      // Convert cents to dollars if needed (for legacy data)
      const value = cents ? amount / 100 : amount;

      return formatAmount({
        currency,
        amount: value,
        locale,
        numberFormat: orgNumberFormat,
        minimumFractionDigits: compact ? 0 : showCents ? 2 : 0,
        maximumFractionDigits: compact ? 1 : showCents ? 2 : 0,
        notation: compact ? "compact" : "standard",
        signDisplay: showSign ? "exceptZero" : "auto",
      });
    },
    [orgCurrency, orgLocale, orgNumberFormat]
  );

  /**
   * Format a date
   */
  const formatDate = useCallback(
    (date: Date | string | number | null | undefined, options: FormatDateOptions = {}) => {
      if (date === null || date === undefined) {
        return "—";
      }

      const {
        locale = orgLocale,
        timezone = orgTimezone,
        format = "medium",
        includeTime = false,
        timeFormat = "12h",
      } = options;

      const dateObj = date instanceof Date ? date : new Date(date);

      // Handle invalid dates
      if (isNaN(dateObj.getTime())) {
        return "—";
      }

      // ISO format
      if (format === "iso") {
        return dateObj.toISOString();
      }

      // Relative format (simple implementation)
      if (format === "relative") {
        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        // Future date
        if (diffMs < 0) {
          const absSecs = Math.abs(diffSecs);
          const absMins = Math.abs(diffMins);
          const absHours = Math.abs(diffHours);
          const absDays = Math.abs(diffDays);

          if (absSecs < 60) return "in a moment";
          if (absMins < 60) return `in ${absMins}m`;
          if (absHours < 24) return `in ${absHours}h`;
          if (absDays === 1) return "tomorrow";
          if (absDays < 30) return `in ${absDays}d`;
          if (absDays < 365) return `in ${Math.floor(absDays / 30)}mo`;
          return `in ${Math.floor(absDays / 365)}y`;
        }

        // Past date
        if (diffSecs < 60) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
      }

      // Build format options
      const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
      };

      switch (format) {
        case "short":
          formatOptions.dateStyle = "short";
          break;
        case "medium":
          formatOptions.dateStyle = "medium";
          break;
        case "long":
          formatOptions.dateStyle = "long";
          break;
        case "full":
          formatOptions.dateStyle = "full";
          break;
        default:
          formatOptions.dateStyle = "medium";
      }

      if (includeTime) {
        formatOptions.timeStyle = "short";
        formatOptions.hour12 = timeFormat === "12h";
      }

      return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
    },
    [orgLocale, orgTimezone]
  );

  /**
   * Format a number
   */
  const formatNumber = useCallback(
    (value: number | null | undefined, options: FormatNumberOptions = {}) => {
      if (value === null || value === undefined) {
        return "—";
      }

      const {
        locale = orgLocale,
        decimals = 0,
        useGrouping = true,
      } = options;

      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      }).format(value);
    },
    [orgLocale]
  );

  /**
   * Format a percentage
   */
  const formatPercent = useCallback(
    (value: number | null | undefined, options: { decimals?: number; multiply?: boolean } = {}) => {
      if (value === null || value === undefined) {
        return "—";
      }

      const { decimals = 1, multiply = true } = options;
      const percentValue = multiply ? value * 100 : value;

      return `${percentValue.toFixed(decimals)}%`;
    },
    []
  );

  return useMemo(
    () => ({
      formatCurrency,
      formatDate,
      formatNumber,
      formatPercent,
      settings: {
        currency: orgCurrency,
        locale: orgLocale,
        timezone: orgTimezone,
        dateFormat: orgDateFormat,
      },
    }),
    [
      formatCurrency,
      formatDate,
      formatNumber,
      formatPercent,
      orgCurrency,
      orgLocale,
      orgTimezone,
      orgDateFormat,
    ]
  );
}

// Export types
export type { FormatCurrencyOptions, FormatDateOptions, FormatNumberOptions };

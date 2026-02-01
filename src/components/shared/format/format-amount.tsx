/**
 * FormatAmount Component
 *
 * Displays currency amounts with consistent formatting, color coding, and size variants.
 * Uses organization settings (currency, locale) from OrganizationSettingsContext.
 * Centralizes all currency display logic across the application.
 *
 * @example
 * ```tsx
 * // Basic usage - uses org settings (amounts are in dollars)
 * <FormatAmount amount={125.00} />
 * // Output: $125.00 (assuming AUD/en-AU)
 *
 * // Color-coded with sign
 * <FormatAmount amount={-5000} colorCode showSign />
 * // Output: -$50.00 (in red)
 *
 * // Large number, compact notation
 * <FormatAmount amount={1250000} compact />
 * // Output: $12.5K
 *
 * // Different size
 * <FormatAmount amount={100000} size="2xl" colorCode />
 * // Output: $1,000.00 (large, green)
 *
 * // Override currency/locale
 * <FormatAmount amount={100000} currency="USD" />
 * // Output: $1,000.00 USD
 * ```
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "~/contexts/organization-settings-context";
import { formatAmount } from "@/lib/currency";

export interface FormatAmountProps {
  /** The amount to display */
  amount: number | null | undefined;

  /**
   * Currency code (defaults to organization's currency)
   * Use this to override for specific currencies
   */
  currency?: string;

  /**
   * Locale for formatting (defaults to organization's locale)
   * Use this to override for specific locales
   */
  locale?: string;

  /**
   * Whether amount is in cents (default: false - amounts are in dollars)
   * Only set to true for legacy cents-based data
   */
  cents?: boolean;

  /**
   * Show +/- sign for non-zero values
   * Useful for showing changes: +$150.00
   */
  showSign?: boolean;

  /**
   * Apply color coding based on value
   * - positive: green (success)
   * - negative: red (destructive)
   * - zero: muted
   */
  colorCode?: boolean;

  /**
   * Size variant
   * - "sm": text-sm (14px)
   * - "base": text-base (16px)
   * - "lg": text-lg (18px)
   * - "xl": text-xl (20px)
   * - "2xl": text-2xl (24px)
   */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /**
   * Use compact notation for large numbers
   * e.g., $12.5K, $1.2M
   */
  compact?: boolean;

  /**
   * Show decimal places (default: true for non-compact)
   */
  showCents?: boolean;

  /** Additional CSS class names */
  className?: string;
}

export const FormatAmount = memo(function FormatAmount({
  amount,
  currency: currencyProp,
  locale: localeProp,
  cents = false, // Default to dollars
  showSign = false,
  colorCode = false,
  size = "base",
  compact = false,
  showCents = true, // Always show cents by default
  className,
}: FormatAmountProps) {
  // Get organization settings from context
  const settings = useOrganizationSettings();

  // Use props if provided, otherwise fall back to org settings
  const currency = currencyProp ?? settings.currency;
  const locale = localeProp ?? settings.locale;
  const numberFormat = settings.numberFormat;

  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Convert cents to dollars if needed (for legacy data)
  const value = cents ? amount / 100 : amount;

  // Format the value using organization locale and currency
  const formatted = formatAmount({
    currency,
    amount: value,
    locale,
    numberFormat,
    minimumFractionDigits: compact ? 0 : showCents ? 2 : 0,
    maximumFractionDigits: compact ? 1 : showCents ? 2 : 0,
    notation: compact ? "compact" : "standard",
    signDisplay: showSign ? "exceptZero" : "auto",
  });

  return (
    <span
      className={cn(
        "tabular-nums",
        // Size variants
        size === "sm" && "text-sm",
        size === "base" && "text-base",
        size === "lg" && "text-lg font-medium",
        size === "xl" && "text-xl font-semibold",
        size === "2xl" && "text-2xl font-bold",
        // Color coding
        colorCode && value > 0 && "text-emerald-600 dark:text-emerald-400",
        colorCode && value < 0 && "text-red-600 dark:text-red-400",
        colorCode && value === 0 && "text-muted-foreground",
        className
      )}
    >
      {formatted}
    </span>
  );
});

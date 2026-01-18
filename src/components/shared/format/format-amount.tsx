/**
 * FormatAmount Component
 *
 * Displays currency amounts with consistent formatting, color coding, and size variants.
 * Centralizes all currency display logic across the application.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormatAmount amount={12500} />
 * // Output: $125.00
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
 * ```
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

export interface FormatAmountProps {
  /** The amount to display */
  amount: number | null | undefined;

  /** Currency code (default: "AUD") */
  currency?: "AUD" | "USD" | "EUR" | "GBP";

  /**
   * Whether amount is in cents (default: true)
   * Most renoz data is stored in cents
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
  currency = "AUD",
  cents = true,
  showSign = false,
  colorCode = false,
  size = "base",
  compact = false,
  showCents = true,
  className,
}: FormatAmountProps) {
  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Convert cents to dollars if needed
  const value = cents ? amount / 100 : amount;

  // Format the value
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    signDisplay: showSign ? "exceptZero" : "auto",
    minimumFractionDigits: compact ? 0 : showCents ? 2 : 0,
    maximumFractionDigits: compact ? 1 : showCents ? 2 : 0,
  }).format(value);

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

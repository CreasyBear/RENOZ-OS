/**
 * FormatPercent Component
 *
 * Displays percentage values with optional color coding and sign display.
 *
 * @example
 * ```tsx
 * // Basic percentage
 * <FormatPercent value={45.5} />
 * // Output: 46%
 *
 * // With decimals and color
 * <FormatPercent value={-12.34} decimals={2} colorCode showSign />
 * // Output: -12.34% (in red)
 *
 * // Large positive change
 * <FormatPercent value={125} decimals={1} colorCode showSign size="lg" />
 * // Output: +125.0% (in green, large)
 * ```
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

export interface FormatPercentProps {
  /** The percentage value (e.g., 45.5 for 45.5%) */
  value: number | null | undefined;

  /** Decimal places (default: 0) */
  decimals?: number;

  /** Show +/- sign for non-zero values */
  showSign?: boolean;

  /** Apply color coding based on value */
  colorCode?: boolean;

  /** Size variant */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /** Additional CSS class names */
  className?: string;
}

export const FormatPercent = memo(function FormatPercent({
  value,
  decimals = 0,
  showSign = false,
  colorCode = false,
  size = "base",
  className,
}: FormatPercentProps) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Format with sign if requested
  const sign = showSign && value > 0 ? "+" : "";
  const formatted = `${sign}${value.toFixed(decimals)}%`;

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

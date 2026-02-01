/**
 * FormatDelta Component
 *
 * Displays change indicators with directional arrows and color coding.
 * Useful for showing increases/decreases in metrics.
 * Uses organization settings (currency, locale) from OrganizationSettingsContext.
 *
 * @example
 * ```tsx
 * // Percentage change with arrow
 * <FormatDelta value={12.5} type="percent" />
 * // Output: ↑ 12.5% (in green)
 *
 * // Amount change - uses org currency
 * <FormatDelta value={-5000} type="amount" indicator="triangle" />
 * // Output: ▼ $50.00 (in red)
 *
 * // Inverted (for costs where decrease is good)
 * <FormatDelta value={-15} type="percent" invertColors />
 * // Output: ↓ 15% (in green, because decrease in cost is good)
 * ```
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "~/contexts/organization-settings-context";
import { FormatAmount } from "./format-amount";
import { FormatPercent } from "./format-percent";

export interface FormatDeltaProps {
  /** The change value (can be amount or percentage) */
  value: number | null | undefined;

  /**
   * Type of delta display
   * - "percent": Show as percentage (e.g., ↑ 12.5%)
   * - "amount": Show as currency (e.g., ↑ $125.00)
   */
  type?: "percent" | "amount";

  /**
   * For "amount" type: currency code (defaults to org currency)
   * Use this to override for specific currencies
   */
  currency?: string;

  /**
   * For "amount" type: locale for formatting (defaults to org locale)
   * Use this to override for specific locales
   */
  locale?: string;

  /** For "amount" type: whether value is in cents */
  cents?: boolean;

  /** Decimal places for percentage (default: 1) */
  decimals?: number;

  /**
   * Arrow style
   * - "arrow": ↑ / ↓
   * - "triangle": ▲ / ▼
   * - "none": no indicator
   */
  indicator?: "arrow" | "triangle" | "none";

  /** Size variant */
  size?: "sm" | "base" | "lg" | "xl" | "2xl";

  /**
   * Invert color logic (useful for costs where decrease is good)
   * Default: increase = green, decrease = red
   * Inverted: increase = red, decrease = green
   */
  invertColors?: boolean;

  /** Additional CSS class names */
  className?: string;
}

const INDICATORS = {
  arrow: {
    up: "↑",
    down: "↓",
    neutral: "→",
  },
  triangle: {
    up: "▲",
    down: "▼",
    neutral: "▶",
  },
  none: {
    up: "",
    down: "",
    neutral: "",
  },
};

export const FormatDelta = memo(function FormatDelta({
  value,
  type = "percent",
  currency: currencyProp,
  locale: localeProp,
  cents = true,
  decimals = 1,
  indicator = "arrow",
  size = "base",
  invertColors = false,
  className,
}: FormatDeltaProps) {
  // Get organization settings from context
  const settings = useOrganizationSettings();

  // Use props if provided, otherwise fall back to org settings
  const currency = currencyProp ?? settings.currency;
  const locale = localeProp ?? settings.locale;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Determine direction
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  // Get indicator symbol
  const symbols = INDICATORS[indicator];
  const symbol = isPositive
    ? symbols.up
    : isNegative
      ? symbols.down
      : symbols.neutral;

  // Determine color (with optional inversion)
  const shouldBeGreen = invertColors ? isNegative : isPositive;
  const shouldBeRed = invertColors ? isPositive : isNegative;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        // Size variants
        size === "sm" && "text-sm",
        size === "base" && "text-base",
        size === "lg" && "text-lg font-medium",
        size === "xl" && "text-xl font-semibold",
        size === "2xl" && "text-2xl font-bold",
        // Color coding
        shouldBeGreen && "text-emerald-600 dark:text-emerald-400",
        shouldBeRed && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      {symbol && <span className="inline-block">{symbol}</span>}
      {type === "percent" ? (
        <FormatPercent
          value={Math.abs(value)}
          decimals={decimals}
          size={size}
          className="!text-inherit"
        />
      ) : (
        <FormatAmount
          amount={Math.abs(value)}
          currency={currency}
          locale={locale}
          cents={cents}
          size={size}
          className="!text-inherit"
        />
      )}
    </span>
  );
});

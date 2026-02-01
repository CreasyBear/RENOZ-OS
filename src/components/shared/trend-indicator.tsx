/**
 * Trend Indicator Component
 *
 * Displays trend direction and percentage change.
 * Three styles: badge, icon, inline.
 *
 * @see docs/design-system/METRIC-CARD-STANDARDS.md
 */

import { memo } from "react";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

export type TrendStyle = "badge" | "icon" | "inline";

export interface TrendIndicatorProps {
  /** Percentage change value (e.g., 12.5 for +12.5%) */
  delta: number;
  /** Display style variant */
  style?: TrendStyle;
  /** Override automatic positive/negative detection */
  positive?: boolean;
  /** Show + prefix for positive values */
  showSign?: boolean;
  /** Additional classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TrendIndicator = memo(function TrendIndicator({
  delta,
  style = "inline",
  positive,
  showSign = true,
  className,
}: TrendIndicatorProps) {
  // Determine if trend is positive (can be overridden)
  const isPositive = positive ?? delta > 0;
  const isNeutral = delta === 0;

  // Format the delta value
  const formattedDelta = `${showSign && delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;

  if (isNeutral) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        0%
      </span>
    );
  }

  // Badge style (ReUI pattern)
  if (style === "badge") {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "gap-0.5 font-medium",
          isPositive
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
          className
        )}
      >
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
        )}
        <span className="sr-only">{isPositive ? "Increased by" : "Decreased by"}</span>
        {formattedDelta}
      </Badge>
    );
  }

  // Icon style (Square UI pattern with glow)
  if (style === "icon") {
    return (
      <span
        role="presentation"
        className={cn(
          "flex items-center gap-1.5",
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400",
          className
        )}
        style={{
          textShadow: isPositive
            ? "0 1px 6px rgba(16, 185, 129, 0.3)"
            : "0 1px 6px rgba(239, 68, 68, 0.3)",
        }}
      >
        {isPositive ? (
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="size-3.5" aria-hidden="true" />
        )}
        <span className="sr-only">{isPositive ? "Increased by" : "Decreased by"}</span>
        <span className="text-sm font-medium">{formattedDelta}</span>
      </span>
    );
  }

  // Inline style (default, compact)
  return (
    <span
      className={cn(
        "flex items-center text-xs font-medium",
        isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3 mr-0.5" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-0.5" aria-hidden="true" />
      )}
      <span className="sr-only">{isPositive ? "Increased by" : "Decreased by"}</span>
      {formattedDelta}
    </span>
  );
});

export default TrendIndicator;

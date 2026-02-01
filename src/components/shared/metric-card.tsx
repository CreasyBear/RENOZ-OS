/**
 * Metric Card Component
 *
 * Reusable metric card for displaying KPIs with loading state and trends.
 * Three variants: simple, nested (premium), compact.
 *
 * @see docs/design-system/METRIC-CARD-STANDARDS.md
 */

import { memo } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendIndicator, type TrendStyle } from "./trend-indicator";

// ============================================================================
// TYPES
// ============================================================================

export type MetricCardVariant = "simple" | "nested" | "compact";

export interface MetricCardProps {
  /** Card title/label */
  title: string;
  /** Primary value to display (string or ReactNode) */
  value: React.ReactNode;
  /** Card variant */
  variant?: MetricCardVariant;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Custom icon color class (e.g., "text-green-600") */
  iconClassName?: string;
  /** Trend percentage (e.g., 12.5 for +12.5%) */
  delta?: number;
  /** Override automatic positive/negative detection for trend */
  positive?: boolean;
  /** Style for trend indicator */
  trendStyle?: TrendStyle;
  /** Comparison/subtitle text (e.g., "vs last month: 1,098") */
  subtitle?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Click handler for drill-down */
  onClick?: () => void;
  /** Alert state (adds warning styling) */
  alert?: boolean;
  /** Additional classes */
  className?: string;
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function SimpleCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function NestedCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="bg-muted/50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-px bg-border" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function CompactCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3 rounded" />
      </div>
      <Skeleton className="h-6 w-16" />
    </Card>
  );
}

// ============================================================================
// VARIANT COMPONENTS
// ============================================================================

interface VariantProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  delta?: number;
  positive?: boolean;
  trendStyle?: TrendStyle;
  subtitle?: string;
  onClick?: () => void;
  alert?: boolean;
  className?: string;
}

/**
 * Simple KPI Card
 * Standard card with header title, large value, and optional trend
 */
function SimpleCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  delta,
  positive,
  trendStyle = "inline",
  subtitle,
  onClick,
  alert,
  className,
}: VariantProps) {
  const clickableStyles = onClick
    ? "cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "";

  const alertStyles = alert ? "border-amber-200 dark:border-amber-500/50" : "";

  return (
    <Card
      className={cn(clickableStyles, alertStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4",
              iconClassName ?? (alert ? "text-amber-500" : "text-muted-foreground")
            )}
          />
        )}
      </CardHeader>
      <CardContent>
        <div
          className="text-2xl font-bold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {delta !== undefined && delta !== 0 && (
            <TrendIndicator
              delta={delta}
              positive={positive}
              style={trendStyle}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Nested Value Card (Square UI Pattern)
 * Premium feel with value in muted background container and separator
 */
function NestedCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  delta,
  positive,
  trendStyle = "icon",
  subtitle,
  onClick,
  alert,
  className,
}: VariantProps) {
  const clickableStyles = onClick
    ? "cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "";

  const alertStyles = alert ? "border-amber-200 dark:border-amber-500/50" : "";

  return (
    <Card
      className={cn("p-4", clickableStyles, alertStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{title}</span>
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              iconClassName ?? (alert ? "text-amber-500" : "text-muted-foreground")
            )}
          />
        )}
      </div>

      <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span
            className="text-2xl sm:text-3xl font-medium tracking-tight tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {value}
          </span>

          {(delta !== undefined && delta !== 0) || subtitle ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-px bg-border" />
              {delta !== undefined && delta !== 0 ? (
                <TrendIndicator
                  delta={delta}
                  positive={positive}
                  style={trendStyle}
                />
              ) : subtitle ? (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Subtitle below nested container if both trend and subtitle provided */}
      {delta !== undefined && delta !== 0 && subtitle && (
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      )}
    </Card>
  );
}

/**
 * Compact Card
 * Minimal variant for secondary metrics in dense grids
 */
function CompactCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  delta,
  positive,
  onClick,
  alert,
  className,
}: VariantProps) {
  const clickableStyles = onClick
    ? "cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "";

  const alertStyles = alert ? "border-amber-200 dark:border-amber-500/50" : "";

  return (
    <Card
      className={cn("p-3", clickableStyles, alertStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <Icon
            className={cn(
              "size-3",
              iconClassName ?? (alert ? "text-amber-500" : "text-muted-foreground")
            )}
          />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-lg font-semibold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <TrendIndicator delta={delta} positive={positive} style="inline" />
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MetricCard = memo(function MetricCard({
  variant = "simple",
  isLoading,
  ...props
}: MetricCardProps) {
  // Loading states by variant
  if (isLoading) {
    switch (variant) {
      case "nested":
        return <NestedCardSkeleton className={props.className} />;
      case "compact":
        return <CompactCardSkeleton className={props.className} />;
      default:
        return <SimpleCardSkeleton className={props.className} />;
    }
  }

  // Render variant
  switch (variant) {
    case "nested":
      return <NestedCard {...props} />;
    case "compact":
      return <CompactCard {...props} />;
    default:
      return <SimpleCard {...props} />;
  }
});

export default MetricCard;

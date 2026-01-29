/**
 * Metric Card Component
 *
 * Reusable metric card for displaying KPIs with loading state and trends.
 * Used across all domain index routes for summary statistics.
 *
 * @see STANDARDS.md - Shared components should be domain-agnostic
 */

import { memo } from "react";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// TYPES
// ============================================================================

export interface MetricCardProps {
  /** Card title/label */
  title: string;
  /** Primary value to display (string or ReactNode) */
  value: React.ReactNode;
  /** Optional subtitle text */
  subtitle?: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional trend percentage text (e.g., "+12%") */
  trend?: string;
  /** Whether trend is positive (green) or negative (red) */
  trendUp?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Click handler for drill-down */
  onClick?: () => void;
  /** Alert state (adds warning border) */
  alert?: boolean;
  /** Additional classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  isLoading,
  onClick,
  alert,
  className,
}: MetricCardProps) {
  // Loading state
  if (isLoading) {
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

  const clickableStyles = onClick
    ? "cursor-pointer hover:bg-accent/50 transition-colors"
    : "";

  const alertStyles = alert ? "border-amber-200" : "";

  return (
    <Card
      className={cn(clickableStyles, alertStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-4 w-4",
            alert ? "text-amber-500" : "text-muted-foreground"
          )}
        />
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
          {trend && (
            <span
              className={cn(
                "flex items-center text-xs font-medium",
                trendUp ? "text-green-600" : "text-red-600"
              )}
            >
              {trendUp ? (
                <TrendingUp className="h-3 w-3 mr-0.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" aria-hidden="true" />
              )}
              <span className="sr-only">
                {trendUp ? "Increased by" : "Decreased by"}
              </span>
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

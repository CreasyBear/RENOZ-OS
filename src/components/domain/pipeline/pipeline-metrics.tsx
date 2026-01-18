/**
 * PipelineMetrics Component
 *
 * Displays key pipeline metrics at the top of the board.
 * Shows conversion rate, average deal value, total value, and weighted value.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { memo } from "react";
import { TrendingUp, DollarSign, Target, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatAmount } from "@/components/shared/format";
import type { PipelineMetrics as PipelineMetricsType } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineMetricsProps {
  metrics: PipelineMetricsType | null;
  isLoading?: boolean;
}

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
}

function MetricCard({ label, value, icon, subtitle, isLoading }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-xl font-semibold font-display truncate">
                {value}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PipelineMetrics = memo(function PipelineMetrics({
  metrics,
  isLoading = false,
}: PipelineMetricsProps) {
  // Calculate average deal value
  const avgDealValue =
    metrics && metrics.opportunityCount > 0
      ? Math.round(metrics.totalValue / metrics.opportunityCount)
      : 0;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      role="region"
      aria-label="Pipeline metrics"
      aria-live="polite"
    >
      <MetricCard
        label="Conversion Rate"
        value={`${metrics?.conversionRate ?? 0}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        subtitle="Won vs closed"
        isLoading={isLoading}
      />
      <MetricCard
        label="Avg Deal Value"
        value={<FormatAmount amount={avgDealValue} />}
        icon={<Target className="h-5 w-5" />}
        isLoading={isLoading}
      />
      <MetricCard
        label="Total Value"
        value={<FormatAmount amount={metrics?.totalValue ?? 0} />}
        icon={<DollarSign className="h-5 w-5" />}
        subtitle={`${metrics?.opportunityCount ?? 0} opportunities`}
        isLoading={isLoading}
      />
      <MetricCard
        label="Weighted Value"
        value={<FormatAmount amount={metrics?.weightedValue ?? 0} />}
        icon={<Scale className="h-5 w-5" />}
        subtitle="Probability adjusted"
        isLoading={isLoading}
      />
    </div>
  );
});

export default PipelineMetrics;

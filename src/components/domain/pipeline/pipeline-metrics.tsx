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
import { MetricCard, FormatAmount } from "@/components/shared";
import type { PipelineMetrics as PipelineMetricsType } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineMetricsProps {
  metrics: PipelineMetricsType | null;
  isLoading?: boolean;
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
        title="Conversion Rate"
        value={`${metrics?.conversionRate ?? 0}%`}
        icon={TrendingUp}
        subtitle="Won vs closed"
        isLoading={isLoading}
      />
      <MetricCard
        title="Avg Deal Value"
        value={<FormatAmount amount={avgDealValue} />}
        icon={Target}
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Value"
        value={<FormatAmount amount={metrics?.totalValue ?? 0} />}
        icon={DollarSign}
        subtitle={`${metrics?.opportunityCount ?? 0} opportunities`}
        isLoading={isLoading}
      />
      <MetricCard
        title="Weighted Value"
        value={<FormatAmount amount={metrics?.weightedValue ?? 0} />}
        icon={Scale}
        subtitle="Probability adjusted"
        isLoading={isLoading}
      />
    </div>
  );
});

export default PipelineMetrics;

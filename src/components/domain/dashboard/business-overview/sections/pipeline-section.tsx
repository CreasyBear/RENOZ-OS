/**
 * Pipeline Section
 *
 * Displays pipeline & sales KPIs: Pipeline Value, Weighted Value, Conversion Rate, Expiring Quotes
 * Plus pipeline by stage and 6-month forecast charts.
 *
 * Uses shared MetricCard component per METRIC-CARD-STANDARDS.md
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target, Scale, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { MetricCardPopover, type RecentItem } from '@/components/shared/metric-card-popover';
import { EmptyState } from '@/components/shared/empty-state';
import { FormatAmount } from '@/components/shared/format';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  conversionRate: number;
  expiringQuotesCount: number;
  // Contextual data for insights
  opportunityCount?: number;     // Total open opportunities
  avgDealSize?: number;          // Average deal value
  wonCount?: number;             // Won this period
  lostCount?: number;            // Lost this period
  // Recent items for popovers
  recentOpportunities?: RecentItem[];
}

export interface StageData {
  stage: string;
  count: number;
  value: number;
}

export interface ForecastPoint {
  period: string;
  value: number;
  weightedValue?: number;
}

export interface PipelineSectionProps {
  metrics?: PipelineMetrics | null;
  stageData?: StageData[] | null;
  forecast?: ForecastPoint[] | null;
  isLoading?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Stage colors for the pipeline chart
const stageColors: Record<string, string> = {
  lead: 'bg-slate-400',
  qualified: 'bg-blue-400',
  proposal: 'bg-indigo-400',
  negotiation: 'bg-purple-400',
  'closed-won': 'bg-green-500',
  'closed-lost': 'bg-red-400',
};

function getStageColor(stage: string): string {
  return stageColors[stage.toLowerCase().replace(/\s+/g, '-')] || 'bg-gray-400';
}

// ============================================================================
// CHART COMPONENTS
// ============================================================================

interface PipelineStageChartProps {
  data: StageData[];
  isLoading?: boolean;
}

function PipelineStageChart({ data, isLoading }: PipelineStageChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <EmptyState
          icon={BarChart3}
          message="No pipeline data available."
          className="py-4"
        />
      </div>
    );
  }

  const totalStageValue = data.reduce((sum, s) => sum + s.value, 0);

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4"
      role="figure"
      aria-label={`Pipeline by stage showing ${data.length} stages with total value of ${formatCurrency(totalStageValue)}`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-3">Pipeline by Stage</p>
      {/* Accessible summary */}
      <p className="sr-only">
        Pipeline breakdown: {data.map((s) => `${s.stage}: ${formatCurrency(s.value)}`).join(', ')}.
      </p>
      <div className="space-y-2">
        {data.map((stage) => {
          const percentage = totalStageValue > 0 ? (stage.value / totalStageValue) * 100 : 0;
          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="capitalize flex items-center gap-2">
                  <span
                    className={cn('size-2 rounded-full', getStageColor(stage.stage))}
                    aria-hidden="true"
                  />
                  {stage.stage.replace(/-/g, ' ')}
                </span>
                <span className="text-muted-foreground">{formatCurrency(stage.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={cn('h-full rounded-full transition-all', getStageColor(stage.stage))}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ForecastChartProps {
  data: ForecastPoint[];
  isLoading?: boolean;
}

function ForecastChart({ data, isLoading }: ForecastChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <EmptyState
          icon={BarChart3}
          message="No forecast data available."
          className="py-4"
        />
      </div>
    );
  }

  const displayData = data.slice(0, 6);
  const maxValue = Math.max(...displayData.map((p) => p.value));
  const totalForecast = displayData.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4"
      role="figure"
      aria-label={`6-month forecast showing projected revenue of ${formatCurrency(totalForecast)}`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-3">6-Month Forecast</p>
      {/* Accessible summary */}
      <p className="sr-only">
        Forecast: {displayData.map((p) => `${p.period}: ${formatCurrency(p.value)}`).join(', ')}.
        Total projected: {formatCurrency(totalForecast)}.
      </p>
      <div className="flex items-end gap-2 h-24" aria-hidden="true">
        {displayData.map((point, idx) => {
          const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/60 rounded-t transition-all hover:bg-primary focus:bg-primary focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ height: `${Math.max(height, 4)}%` }}
                tabIndex={0}
                role="img"
                aria-label={`${point.period}: ${formatCurrency(point.value)}`}
              />
              <span className="text-[10px] text-muted-foreground truncate max-w-full">
                {point.period.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PipelineSection({
  metrics,
  stageData,
  forecast,
  isLoading,
}: PipelineSectionProps) {
  const navigate = useNavigate();

  // Build contextual subtitles
  const pipelineSubtitle = metrics?.opportunityCount
    ? `${metrics.opportunityCount} opportunit${metrics.opportunityCount !== 1 ? 'ies' : 'y'}`
    : undefined;

  const weightedSubtitle = metrics?.avgDealSize
    ? `Avg deal ${formatCurrency(metrics.avgDealSize)}`
    : undefined;

  const conversionSubtitle =
    metrics?.wonCount !== undefined && metrics?.lostCount !== undefined
      ? `${metrics.wonCount} won / ${metrics.wonCount + metrics.lostCount} closed`
      : undefined;

  const quotesSubtitle =
    metrics?.expiringQuotesCount && metrics.expiringQuotesCount > 0
      ? 'Expiring within 7 days'
      : 'None expiring soon';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Pipeline & Sales</CardTitle>
        <Link to="/pipeline" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          View Details
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid - Using shared MetricCard with drill-down and popovers */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardPopover
            items={metrics?.recentOpportunities}
            viewAllHref="/pipeline"
            viewAllLabel="View all opportunities"
            emptyMessage="No open opportunities"
            disabled={isLoading}
          >
            <MetricCard
              title="Pipeline Value"
              value={<FormatAmount amount={metrics?.totalValue ?? 0} currency="AUD" />}
              subtitle={pipelineSubtitle}
              icon={Target}
              onClick={() => navigate({ to: '/pipeline' })}
              isLoading={isLoading}
            />
          </MetricCardPopover>
          <MetricCard
            title="Weighted Value"
            value={<FormatAmount amount={metrics?.weightedValue ?? 0} currency="AUD" />}
            subtitle={weightedSubtitle}
            icon={Scale}
            onClick={() => navigate({ to: '/reports/pipeline-forecast' })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Conversion Rate"
            value={formatPercent(metrics?.conversionRate ?? 0)}
            subtitle={conversionSubtitle}
            icon={TrendingUp}
            onClick={() => navigate({ to: '/pipeline', search: { view: 'analytics' } })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Expiring Quotes"
            value={String(metrics?.expiringQuotesCount ?? 0)}
            subtitle={quotesSubtitle}
            icon={Clock}
            alert={!!metrics?.expiringQuotesCount && metrics.expiringQuotesCount > 0}
            onClick={() => navigate({ to: '/pipeline', search: { filter: 'expiring-quotes' } })}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PipelineStageChart data={stageData ?? []} isLoading={isLoading} />
          <ForecastChart data={forecast ?? []} isLoading={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}

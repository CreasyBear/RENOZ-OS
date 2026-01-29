/**
 * Support Dashboard Route
 *
 * LAYOUT: full-width
 *
 * Support team performance overview with metrics, charts, and quick actions.
 *
 * LAYOUT: full-width
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-006
 */

import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDashboardSkeleton } from '@/components/skeletons/support';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSupportMetrics } from '@/hooks/support';
import { useCsatMetrics } from '@/hooks/support';
import { CsatMetricsWidget } from '@/components/domain/support';
import { CsatLowRatingAlerts } from '@/components/domain/support';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
  ListChecks,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/dashboard')({
  component: SupportDashboardPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support Dashboard"
        description="Monitor support performance and team metrics"
      />
      <PageLayout.Content>
        <SupportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
  loading,
}: MetricCardProps) {
  const variantColors = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('h-4 w-4', variantColors[variant])}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
        {trend && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              trend.direction === 'up' && 'text-green-500',
              trend.direction === 'down' && 'text-red-500',
              trend.direction === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            <span>
              {trend.value > 0 ? '+' : ''}
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// BREAKDOWN CHART COMPONENT
// ============================================================================

interface BreakdownChartProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  loading?: boolean;
}

function BreakdownChart({ title, data, loading }: BreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-cyan-500',
    'bg-pink-500',
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const color = item.color || colors[index % colors.length];

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{item.label.replace(/_/g, ' ')}</span>
                <span className="font-medium">
                  {item.value} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <Progress value={percentage} className={cn('h-2', color)} />
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function SupportDashboardPage() {
  const { data: metrics, isLoading, error, refetch } = useSupportMetrics();
  const { data: csatMetrics, isLoading: csatLoading, error: csatError } = useCsatMetrics();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support Dashboard"
        description="Monitor support performance and team metrics"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Button>
          </div>
        }
      />

      <PageLayout.Content>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="text-destructive h-8 w-8" />
            <div>
              <p className="font-medium">Failed to load metrics</p>
              <p className="text-muted-foreground text-sm">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Open Issues"
          value={metrics?.overview.openIssues ?? 0}
          description="Awaiting response"
          icon={<AlertCircle className="h-4 w-4" />}
          variant={(metrics?.overview.openIssues ?? 0) > 10 ? 'warning' : 'default'}
          loading={isLoading}
        />
        <MetricCard
          title="In Progress"
          value={metrics?.overview.inProgressIssues ?? 0}
          description="Being worked on"
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          title="Resolved Today"
          value={metrics?.overview.resolvedToday ?? 0}
          description="Closed today"
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="success"
          loading={isLoading}
        />
        <MetricCard
          title="Avg Resolution"
          value={
            metrics?.overview.avgResolutionHours ? `${metrics.overview.avgResolutionHours}h` : '—'
          }
          description="Time to resolve"
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* SLA Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              SLA Performance
            </CardTitle>
            <CardDescription>
              {metrics?.sla.complianceRate.toFixed(1)}% compliance rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="space-y-3">
                <Progress
                  value={metrics?.sla.complianceRate ?? 0}
                  className={cn(
                    'h-3',
                    (metrics?.sla.complianceRate ?? 0) >= 95
                      ? 'bg-green-500'
                      : (metrics?.sla.complianceRate ?? 0) >= 80
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      On Track: {metrics?.sla.onTrack ?? 0}
                    </Badge>
                    <Badge variant="outline" className="text-amber-500">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      At Risk: {metrics?.sla.atRisk ?? 0}
                    </Badge>
                    <Badge variant="outline" className="text-red-500">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Breached: {metrics?.sla.breached ?? 0}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {metrics?.sla.totalTracked ?? 0} tracked
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MetricCard
          title="SLA Breaches"
          value={metrics?.sla.breached ?? 0}
          description="Issues that missed SLA"
          icon={<AlertCircle className="h-4 w-4" />}
          variant={(metrics?.sla.breached ?? 0) > 0 ? 'danger' : 'success'}
          loading={isLoading}
        />

        <MetricCard
          title="Weekly Trend"
          value={Math.abs(metrics?.trend.netChange ?? 0)}
          description={(metrics?.trend.netChange ?? 0) >= 0 ? 'Net new issues' : 'Net resolved'}
          icon={<ListChecks className="h-4 w-4" />}
          trend={{
            value: metrics?.trend.netChange ?? 0,
            direction:
              (metrics?.trend.netChange ?? 0) > 0
                ? 'up'
                : (metrics?.trend.netChange ?? 0) < 0
                  ? 'down'
                  : 'neutral',
            label: 'this week',
          }}
          loading={isLoading}
        />
      </div>

      {/* Breakdown Charts and CSAT */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BreakdownChart
          title="Issues by Status"
          data={
            metrics?.breakdown.byStatus.map((s) => ({
              label: s.status,
              value: s.count,
            })) ?? []
          }
          loading={isLoading}
        />
        <BreakdownChart
          title="Issues by Type"
          data={
            metrics?.breakdown.byType.map((t) => ({
              label: t.type,
              value: t.count,
            })) ?? []
          }
          loading={isLoading}
        />
        <BreakdownChart
          title="Issues by Priority"
          data={
            metrics?.breakdown.byPriority.map((p) => ({
              label: p.priority,
              value: p.count,
              color:
                p.priority === 'critical'
                  ? 'bg-red-500'
                  : p.priority === 'high'
                    ? 'bg-orange-500'
                    : p.priority === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-slate-400',
            })) ?? []
          }
          loading={isLoading}
        />
      </div>

      {/* CSAT Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <CsatMetricsWidget
          metrics={csatMetrics}
          isLoading={csatLoading}
          error={csatError}
          showTrend
          showDistribution
        />
        <CsatLowRatingAlerts
          metrics={csatMetrics}
          isLoading={csatLoading}
          error={csatError}
          limit={3}
        />
      </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

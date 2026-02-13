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

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDashboardSkeleton } from '@/components/skeletons/support';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/shared';
import { useSupportMetrics } from '@/hooks/support';
import { useCsatMetrics } from '@/hooks/support';
import { CsatMetricsWidget } from '@/components/domain/support';
import { CsatLowRatingAlerts } from '@/components/domain/support';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  BarChart3,
  RefreshCw,
  Activity,
  ListChecks,
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

// Note: Using shared MetricCard from @/components/shared

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
  const navigate = useNavigate();
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
            <Button size="sm" onClick={() => navigate({ to: '/support/issues/new' })}>
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
          subtitle="Awaiting response"
          icon={AlertCircle}
          alert={(metrics?.overview.openIssues ?? 0) > 10}
          isLoading={isLoading}
        />
        <MetricCard
          title="In Progress"
          value={metrics?.overview.inProgressIssues ?? 0}
          subtitle="Being worked on"
          icon={Activity}
          isLoading={isLoading}
        />
        <MetricCard
          title="Resolved Today"
          value={metrics?.overview.resolvedToday ?? 0}
          subtitle="Closed today"
          icon={CheckCircle2}
          iconClassName="text-green-600"
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg Resolution"
          value={
            metrics?.overview.avgResolutionHours ? `${metrics.overview.avgResolutionHours}h` : '—'
          }
          subtitle="Time to resolve"
          icon={Clock}
          isLoading={isLoading}
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
                    <Link to="/support/issues" search={{ slaStatus: 'breached' }}>
                      <Badge variant="outline" className="text-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Breached: {metrics?.sla.breached ?? 0}
                      </Badge>
                    </Link>
                  </div>
                  <span className="text-muted-foreground">
                    {metrics?.sla.totalTracked ?? 0} tracked
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Link to="/support/issues" search={{ slaStatus: 'breached' }}>
          <MetricCard
            title="SLA Breaches"
            value={metrics?.sla.breached ?? 0}
            subtitle="Issues that missed SLA"
            icon={AlertCircle}
            iconClassName={(metrics?.sla.breached ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}
            isLoading={isLoading}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          />
        </Link>

        <MetricCard
          title="Weekly Trend"
          value={Math.abs(metrics?.trend.netChange ?? 0)}
          subtitle={(metrics?.trend.netChange ?? 0) >= 0 ? 'Net new issues' : 'Net resolved'}
          icon={ListChecks}
          delta={metrics?.trend.netChange}
          positive={(metrics?.trend.netChange ?? 0) < 0}
          isLoading={isLoading}
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

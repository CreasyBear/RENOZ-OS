/**
 * Support Dashboard Landing Page
 *
 * Transformed from simple navigation to full dashboard experience.
 * Shows quick access cards + live metrics, charts, and actionable widgets.
 *
 * LAYOUT: full-width
 *
 * @see src/routes/_authenticated/support/dashboard.tsx - Detailed metrics view
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-006
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDashboardSkeleton } from '@/components/skeletons/support';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/shared';
import { useSupportMetrics, useCsatMetrics } from '@/hooks/support';
import { CsatMetricsWidget, CsatLowRatingAlerts } from '@/components/domain/support';
import {
  LayoutDashboard,
  Ticket,
  Shield,
  Package,
  FileCheck,
  BookOpen,
  ArrowRight,
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

export const Route = createFileRoute('/_authenticated/support/')({
  component: SupportDashboardPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support"
        description="Customer support, warranties, and claims management"
      />
      <PageLayout.Content>
        <SupportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// NAVIGATION CARDS
// ============================================================================

const supportFeatures = [
  {
    title: 'Issues',
    description: 'Manage customer support tickets and track resolutions',
    href: '/support/issues',
    icon: Ticket,
    color: 'text-orange-500',
  },
  {
    title: 'Warranties',
    description: 'Track warranty records and expiration dates',
    href: '/support/warranties',
    icon: Shield,
    color: 'text-green-500',
  },
  {
    title: 'RMAs',
    description: 'Process returns and manage return merchandise',
    href: '/support/rmas',
    icon: Package,
    color: 'text-purple-500',
  },
  {
    title: 'Claims',
    description: 'Handle warranty and insurance claims',
    href: '/support/claims',
    icon: FileCheck,
    color: 'text-red-500',
  },
  {
    title: 'Knowledge Base',
    description: 'Browse help articles and documentation',
    href: '/support/knowledge-base',
    icon: BookOpen,
    color: 'text-teal-500',
  },
  {
    title: 'Dashboard',
    description: 'Detailed metrics and performance analytics',
    href: '/support/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500',
  },
] as const;

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
  const { data: metrics, isLoading, error, refetch } = useSupportMetrics();
  const { data: csatMetrics, isLoading: csatLoading, error: csatError } = useCsatMetrics();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support"
        description="Customer support, warranties, and claims management"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link
              to="/support/issues/new"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Link>
          </div>
        }
      />

      <PageLayout.Content className="space-y-6">
        {/* Quick Access Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supportFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.href} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{feature.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{feature.description}</CardDescription>
                  <Link
                    to={feature.href}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Open
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
            subtitle="Issues that missed SLA"
            icon={AlertCircle}
            iconClassName={(metrics?.sla.breached ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}
            isLoading={isLoading}
          />

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

/**
 * Procurement Metrics Component
 *
 * Displays key procurement KPIs, order analytics, and cost savings.
 * Provides executive-level metrics overview with status indicators.
 *
 * @see SUPP-ANALYTICS-REPORTING story
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { ProcurementKPI, OrderAnalytics, CostSavings } from '@/lib/schemas/analytics';

// ============================================================================
// TYPES
// ============================================================================

interface ProcurementMetricsProps {
  kpis?: ProcurementKPI[];
  orderAnalytics?: OrderAnalytics;
  costSavings?: CostSavings;
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
  }
}

function getStatusBg(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="mb-2 h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// KPI CARDS
// ============================================================================

interface KPICardsProps {
  kpis: ProcurementKPI[];
}

function KPICards({ kpis }: KPICardsProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const progressValue = (kpi.value / kpi.target) * 100;
        const isGoodTrend =
          (kpi.trend === 'down' && kpi.unit === 'days') ||
          (kpi.trend === 'down' && kpi.unit === 'AUD') ||
          (kpi.trend === 'up' && kpi.unit === '%');

        return (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
              <Badge className={getStatusBg(kpi.status)}>{kpi.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getStatusColor(kpi.status)}`}>
                  {kpi.unit === 'AUD' ? formatCurrencyDisplay(kpi.value) : kpi.value}
                </span>
                {kpi.unit !== 'AUD' && (
                  <span className="text-muted-foreground text-sm">{kpi.unit}</span>
                )}
              </div>
              <Progress value={Math.min(progressValue, 100)} className="mt-2 h-2" />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Target:{' '}
                  {kpi.unit === 'AUD'
                    ? formatCurrencyDisplay(kpi.target)
                    : `${kpi.target}${kpi.unit}`}
                </span>
                <span
                  className={`flex items-center gap-1 ${isGoodTrend ? 'text-green-600' : 'text-red-600'}`}
                >
                  <TrendIcon trend={kpi.trend} />
                  {kpi.trendPercent}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// ORDER ANALYTICS CARD
// ============================================================================

interface OrderAnalyticsCardProps {
  data: OrderAnalytics;
}

function OrderAnalyticsCard({ data }: OrderAnalyticsCardProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  const metrics = [
    {
      icon: ShoppingCart,
      label: 'Total Orders',
      value: data.totalOrders.toLocaleString(),
      subtext: 'Year to date',
    },
    {
      icon: DollarSign,
      label: 'Total Value',
      value: formatCurrencyDisplay(data.totalValue),
      subtext: 'Order value',
    },
    {
      icon: Target,
      label: 'Avg Order Value',
      value: formatCurrencyDisplay(data.avgOrderValue),
      subtext: 'Per order',
    },
    {
      icon: Clock,
      label: 'Avg Lead Time',
      value: `${data.avgLeadTime} days`,
      subtext: 'Order to delivery',
    },
    {
      icon: CheckCircle,
      label: 'On-Time Delivery',
      value: `${data.onTimeDeliveryRate}%`,
      subtext: 'Delivery rate',
    },
    {
      icon: Percent,
      label: 'Completion Rate',
      value: `${data.completionRate}%`,
      subtext: 'Orders completed',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        <CardTitle>Order Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{metric.label}</span>
                </div>
                <div className="mt-1 text-lg font-bold">{metric.value}</div>
                <div className="text-muted-foreground text-xs">{metric.subtext}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COST SAVINGS CARD
// ============================================================================

interface CostSavingsCardProps {
  data: CostSavings;
}

function CostSavingsCard({ data }: CostSavingsCardProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  const savingsBreakdown = [
    {
      label: 'Negotiated Savings',
      value: data.negotiatedSavings,
      percent: (data.negotiatedSavings / data.totalSavings) * 100,
    },
    {
      label: 'Volume Discounts',
      value: data.volumeDiscounts,
      percent: (data.volumeDiscounts / data.totalSavings) * 100,
    },
    {
      label: 'Process Improvement',
      value: data.processImprovement,
      percent: (data.processImprovement / data.totalSavings) * 100,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <DollarSign className="h-5 w-5" />
        <CardTitle>Cost Savings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-green-700 dark:text-green-400">Total Savings</span>
            <span className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrencyDisplay(data.totalSavings)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>{data.savingsPercent}% of total spend</span>
          </div>
        </div>

        <div className="space-y-3">
          {savingsBreakdown.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">{formatCurrencyDisplay(item.value)}</span>
              </div>
              <Progress value={item.percent} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Procurement Metrics Presenter
 * Displays KPI cards, order analytics, and cost savings.
 * Receives all data via props - no sample data defaults.
 *
 * @source kpis from useProcurementDashboard or useSpendMetrics hook
 * @source orderAnalytics from useOrderMetrics hook
 * @source costSavings from useProcurementDashboard hook
 */
function ProcurementMetrics({
  kpis,
  orderAnalytics,
  costSavings,
  isLoading = false,
}: ProcurementMetricsProps) {
  if (isLoading) {
    return <MetricsSkeleton />;
  }

  // Show empty state if no data available
  if (!kpis && !orderAnalytics && !costSavings) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              No procurement data available. Data will appear once purchase orders are created.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {kpis && <KPICards kpis={kpis} />}

      <div className="grid gap-4 md:grid-cols-2">
        {orderAnalytics && <OrderAnalyticsCard data={orderAnalytics} />}
        {costSavings && <CostSavingsCard data={costSavings} />}
      </div>
    </div>
  );
}

export { ProcurementMetrics, KPICards, OrderAnalyticsCard, CostSavingsCard };
export type { ProcurementMetricsProps };

/**
 * Dashboard Route - Simple Business Overview
 *
 * Top-down view of the business with aggregated metrics and revenue charts.
 * No widget system, no customization - just the essential data.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { z } from 'zod';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/domain/dashboard';
import { getPresetRange, type DateRange } from '@/lib/utils/date-presets';
import { useDashboardMetrics } from '@/hooks/dashboard';
import { useOrders } from '@/hooks/orders/use-orders';
import { useInventoryLowStock } from '@/hooks/inventory/use-inventory';
import { Link } from '@tanstack/react-router';
import { UpcomingCallsWidget } from '@/components/domain/communications';
import { WelcomeChecklist } from '@/components/domain/dashboard/welcome-checklist';
import { ActivityFeedWidget } from '@/components/domain/dashboard/widgets/activity-feed-widget';
import { useActivityFeed, useFlattenedActivities } from '@/hooks/activities/use-activities';
import type { ActivityWithUser } from '@/lib/schemas/activities';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const searchSchema = z.object({
  dateRange: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

type DashboardSearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>): DashboardSearchParams => {
    return searchSchema.parse(search);
  },
});

function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const range = getPresetRange('30d');
    return range || { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() };
  });
  const [preset, setPreset] = useState<string>('30d');

  const dateFrom = dateRange.from.toISOString().split('T')[0];
  const dateTo = dateRange.to.toISOString().split('T')[0];

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    const range = getPresetRange(newPreset);
    if (range) setDateRange(range);
  };

  // Fetch metrics
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics({
    dateFrom,
    dateTo,
  });

  // Fetch recent orders
  const { data: ordersData, isLoading: isOrdersLoading } = useOrders({
    page: 1,
    pageSize: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Fetch low stock alerts
  const { data: lowStockData, isLoading: isLowStockLoading } = useInventoryLowStock();

  // Fetch recent activities
  const activityQuery = useActivityFeed({ pageSize: 5 });
  const activities = useFlattenedActivities(activityQuery) as ActivityWithUser[];

  // Extract metrics
  const summary = metrics?.summary;

  const kpis = useMemo(() => [
    {
      label: 'Revenue',
      value: summary?.revenue?.current ?? 0,
      change: summary?.revenue?.change,
      format: formatCurrency,
      icon: DollarSign,
    },
    {
      label: 'Pipeline',
      value: summary?.pipelineValue?.current ?? 0,
      change: summary?.pipelineValue?.change,
      format: formatCurrency,
      icon: TrendingUp,
    },
    {
      label: 'Orders',
      value: summary?.ordersCount?.current ?? 0,
      change: summary?.ordersCount?.change,
      format: (v: number) => v.toString(),
      icon: ShoppingCart,
    },
    {
      label: 'Customers',
      value: summary?.customerCount?.current ?? 0,
      change: summary?.customerCount?.change,
      format: (v: number) => v.toString(),
      icon: Users,
    },
    {
      label: 'kWh Deployed',
      value: summary?.kwhDeployed?.current ?? 0,
      change: summary?.kwhDeployed?.change,
      format: (v: number) => `${v.toLocaleString()} kWh`,
      icon: Zap,
    },
    {
      label: 'Active Installations',
      value: summary?.activeInstallations?.current ?? 0,
      change: summary?.activeInstallations?.change,
      format: (v: number) => v.toString(),
      icon: TrendingUp,
    },
  ], [summary]);

  const recentOrders = ordersData?.orders?.slice(0, 5) ?? [];
  const lowStockItems = lowStockData?.items?.slice(0, 5) ?? [];

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Dashboard"
        description="Business overview and key metrics"
      />

      {/* Date Range Selector */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <DateRangeSelector
          value={dateRange}
          preset={preset}
          onChange={setDateRange}
          onPresetChange={handlePresetChange}
          showPresetLabel
        />
      </div>

      <PageLayout.Content>
        <WelcomeChecklist className="mb-6" />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.format(kpi.value)}
              change={kpi.change}
              icon={kpi.icon}
              isLoading={isMetricsLoading}
            />
          ))}
        </div>

        {/* Revenue Chart Placeholder */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMetricsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <SimpleRevenueChart data={metrics?.charts?.revenueTrend ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Three Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Activity Feed */}
          <DashboardActivityWidget
            activities={activities}
            isLoading={activityQuery.isLoading}
            error={activityQuery.error}
          />

          {/* Upcoming Calls */}
          <UpcomingCallsWidget limit={5} />

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Link
                  to="/orders"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isOrdersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length > 0 ? (
                <div className="divide-y">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to="/orders/$orderId"
                      params={{ orderId: order.id }}
                      className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {order.customer?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(order.total ?? 0, { cents: false, showCents: true })}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No recent orders
                </p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-600">Low Stock Alerts</CardTitle>
                <Link
                  to="/inventory/alerts"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLowStockLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : lowStockItems.length > 0 ? (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <Link
                      key={item.id}
                      to="/inventory/$itemId"
                      params={{ itemId: item.id }}
                      className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 hover:bg-amber-100 transition-colors"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product?.name || 'Unknown Product'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantityOnHand} in stock
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No low stock alerts
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// ACTIVITY WIDGET (Presenter)
// ============================================================================

interface DashboardActivityWidgetProps {
  /** @source useActivityFeed() in DashboardPage container */
  activities: ActivityWithUser[];
  /** @source useActivityFeed() isLoading in DashboardPage container */
  isLoading?: boolean;
  /** @source useActivityFeed() error in DashboardPage container */
  error?: Error | null;
}

function DashboardActivityWidget({
  activities,
  isLoading,
  error,
}: DashboardActivityWidgetProps) {
  return (
    <ActivityFeedWidget
      activities={activities}
      isLoading={isLoading}
      error={error}
      title="Recent Activity"
      description="Latest actions across your organization"
      maxItems={5}
      compact
    />
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{value}</span>
          {change !== undefined && change !== 0 && (
            <span
              className={cn(
                'text-xs font-medium',
                change > 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleRevenueChart({ data }: { data: Array<{ date: string; label?: string; value: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No revenue data for selected period
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-48 flex items-end gap-2">
      {data.map((point, i) => {
        const height = (point.value / maxValue) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1"
            title={`${point.label || point.date}: ${formatCurrency(point.value)}`}
          >
            <div
              className="w-full bg-primary/20 rounded-t hover:bg-primary/30 transition-colors"
              style={{ height: `${height}%`, minHeight: '4px' }}
            />
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {point.label || new Date(point.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        styles[status] || 'bg-gray-100 text-gray-800'
      )}
    >
      {status}
    </span>
  );
}

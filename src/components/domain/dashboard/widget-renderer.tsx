/**
 * Widget Renderer Component
 *
 * Maps widget types to actual widget components and handles data fetching.
 * This is the bridge between the DashboardGrid and the individual widgets.
 *
 * ARCHITECTURE: Container Component - handles data fetching for each widget type.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { memo } from 'react';
import { useDashboardMetrics } from '@/hooks/dashboard';
import { useOrgFormat } from '@/hooks/use-org-format';
import { serializeDateForUrl } from '@/hooks/filters/use-filter-url-state';
import type { DateRange } from '@/lib/utils/date-presets';

// Widget components
import { KPIWidget } from './widgets/kpi-widget';
import { ChartWidget, type ChartDataPoint } from './widgets/chart-widget';
import type { WidgetConfig } from './dashboard-grid';

import {
  TrendingUp,
  Users,
  ShoppingCart,
  Zap,
  DollarSign,
  PieChart,
  Activity,
  Target,
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  Bell,
  Bolt,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface WidgetRendererProps {
  /** Widget configuration from layout */
  widget: WidgetConfig;
  /** Current date range for data filtering */
  dateRange: DateRange;
  /** Optional className */
  className?: string;
}

// ============================================================================
// WIDGET TYPE DEFINITIONS
// ============================================================================

const WIDGET_METADATA: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'kpi' | 'chart' | 'feed' | 'actions' | 'progress' | 'other';
}> = {
  // Composite KPI Widget
  'kpi_cards': { label: 'KPI Overview', icon: LayoutDashboard, category: 'kpi' },

  // Chart Widgets
  'revenue_chart': { label: 'Revenue Trend', icon: DollarSign, category: 'chart' },
  'orders_chart': { label: 'Orders', icon: ShoppingCart, category: 'chart' },
  'customers_chart': { label: 'Customer Growth', icon: Users, category: 'chart' },
  'pipeline_chart': { label: 'Pipeline', icon: PieChart, category: 'chart' },
  'inventory_chart': { label: 'Inventory', icon: Zap, category: 'chart' },

  // Feed Widgets
  'recent_activities': { label: 'Recent Activity', icon: Activity, category: 'feed' },
  'upcoming_tasks': { label: 'Upcoming Tasks', icon: CheckSquare, category: 'feed' },
  'alerts': { label: 'Alerts', icon: Bell, category: 'feed' },

  // Other Widgets
  'quick_actions': { label: 'Quick Actions', icon: Bolt, category: 'actions' },
  'target_progress': { label: 'Target Progress', icon: Target, category: 'progress' },
};

// ============================================================================
// KPI CARDS WIDGET (Composite - shows multiple KPIs)
// ============================================================================

function KPICardsWidget({ dateRange }: { dateRange: DateRange }) {
  const { data: metrics, isLoading, error } = useDashboardMetrics({
    dateFrom: serializeDateForUrl(dateRange.from),
    dateTo: serializeDateForUrl(dateRange.to),
  });

  const { formatCurrency, formatNumber } = useOrgFormat();

  const formatCurrencyDisplay = (val: number) => {
    return formatCurrency(val, { cents: false, showCents: true });
  };

  const kpis = [
    {
      key: 'revenue',
      label: 'Revenue',
      value: metrics?.summary?.revenue?.current ?? 0,
      trend: metrics?.summary?.revenue?.change,
      format: formatCurrencyDisplay,
      icon: DollarSign,
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      value: metrics?.summary?.pipelineValue?.current ?? 0,
      trend: metrics?.summary?.pipelineValue?.change,
      format: formatCurrencyDisplay,
      icon: TrendingUp,
    },
    {
      key: 'orders',
      label: 'Orders',
      value: metrics?.summary?.ordersCount?.current ?? 0,
      trend: metrics?.summary?.ordersCount?.change,
      format: (val: number) => formatNumber(val, { decimals: 0 }),
      icon: ShoppingCart,
    },
    {
      key: 'customers',
      label: 'Customers',
      value: metrics?.summary?.customerCount?.current ?? 0,
      trend: metrics?.summary?.customerCount?.change,
      format: (val: number) => formatNumber(val, { decimals: 0 }),
      icon: Users,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-red-200 bg-red-50">
        <p className="text-sm text-red-600">Failed to load KPIs</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPIWidget
          key={kpi.key}
          value={kpi.format(kpi.value)}
          label={kpi.label}
          icon={kpi.icon}
          trend={kpi.trend !== undefined ? { value: kpi.trend, period: 'vs last period' } : undefined}
          formatValue={(val) => String(val)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// CHART WIDGET RENDERER
// ============================================================================

function ChartWidgetRenderer({
  type,
  dateRange
}: {
  type: string;
  dateRange: DateRange;
}) {
  const { data: metrics, isLoading, error } = useDashboardMetrics({
    dateFrom: serializeDateForUrl(dateRange.from),
    dateTo: serializeDateForUrl(dateRange.to),
  });

  const meta = WIDGET_METADATA[type];

  // Transform data based on chart type
  let data: ChartDataPoint[] = [];
  let chartType: 'line' | 'bar' | 'pie' | 'area' = 'line';

  switch (type) {
    case 'revenue_chart':
      data = metrics?.charts?.revenueTrend?.map((point) => ({
        label: point.label ?? point.date,
        value: point.value,
      })) ?? [];
      chartType = 'line';
      break;
    case 'orders_chart':
      // For orders, we'd need orders trend data - using revenue as placeholder
      data = metrics?.charts?.revenueTrend?.map((point) => ({
        label: point.label ?? point.date,
        value: point.value,
      })) ?? [];
      chartType = 'bar';
      break;
    case 'customers_chart':
      data = metrics?.charts?.revenueTrend?.map((point) => ({
        label: point.label ?? point.date,
        value: point.value,
      })) ?? [];
      chartType = 'area';
      break;
    case 'pipeline_chart':
      data = metrics?.charts?.pipelineByStage?.map((point) => ({
        label: point.label ?? point.date,
        value: point.value,
      })) ?? [];
      chartType = 'pie';
      break;
  }

  return (
    <ChartWidget
      id={type}
      title={meta?.label ?? type}
      icon={meta?.icon}
      data={data}
      type={chartType}
      isLoading={isLoading}
      error={error instanceof Error ? error : error ? new Error(String(error)) : null}
    />
  );
}

// ============================================================================
// ACTIVITY FEED WIDGET (Dashboard-specific)
// ============================================================================

function ActivityFeedWidget({ dateRange }: { dateRange: DateRange }) {
  const { data: metrics, isLoading, error } = useDashboardMetrics({
    dateFrom: serializeDateForUrl(dateRange.from),
    dateTo: serializeDateForUrl(dateRange.to),
  });

  const activities = metrics?.recentActivity ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-red-200 bg-red-50">
        <p className="text-sm text-red-600">Failed to load activities</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
        <Activity className="h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {activities.slice(0, 10).map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{activity.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(activity.createdAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PLACEHOLDER WIDGET (for unimplemented types)
// ============================================================================

function PlaceholderWidget({ type }: { type: string }) {
  const meta = WIDGET_METADATA[type];
  const Icon = meta?.icon ?? Sparkles;

  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-600">{meta?.label ?? type}</p>
      <p className="text-xs text-gray-400">Coming soon</p>
    </div>
  );
}

// ============================================================================
// MAIN WIDGET RENDERER
// ============================================================================

export const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  dateRange,
  className,
}: WidgetRendererProps) {
  const meta = WIDGET_METADATA[widget.type];

  // Render based on widget category
  if (widget.type === 'kpi_cards') {
    return (
      <div className={className}>
        <KPICardsWidget dateRange={dateRange} />
      </div>
    );
  }

  if (meta?.category === 'chart') {
    return (
      <div className={className}>
        <ChartWidgetRenderer type={widget.type} dateRange={dateRange} />
      </div>
    );
  }

  if (widget.type === 'recent_activities') {
    return (
      <div className={className}>
        <ActivityFeedWidget dateRange={dateRange} />
      </div>
    );
  }

  // Fallback for unimplemented widget types
  return (
    <div className={className}>
      <PlaceholderWidget type={widget.type} />
    </div>
  );
});

export default WidgetRenderer;

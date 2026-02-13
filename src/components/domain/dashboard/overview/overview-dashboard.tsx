/**
 * Overview Dashboard Presenter
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Layout (Square UI inspired):
 * - Stats Cards (3-column)
 * - Cash Flow Chart
 * - Two Tables side by side (Projects + Orders)
 */

import { cn } from '@/lib/utils';
import {
  OverviewStats,
  type OverviewStatsData,
  type TrackedProductWithInventory,
} from './overview-stats';
import { CashFlowChart, type CashFlowDataPoint } from './cash-flow-chart';
import { ProjectsTable, type ProjectSummary } from './projects-table';
import { OrdersTable, type OrderSummary } from './orders-table';
import type { TrackedProduct } from './tracked-products-dialog';
import { KPIWidget } from '../widgets/kpi-widget';
import { TargetProgressWidget } from '../target-progress';

// ============================================================================
// TYPES
// ============================================================================

export interface OverviewDashboardProps {
  kpiWidgets?: Array<{
    key: string;
    label: string;
    value: string;
    trend?: number;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  kpiLoading?: boolean;
  kpiError?: Error | null;
  onKpiRetry?: () => void;
  targetProgress?: Parameters<typeof TargetProgressWidget>[0]['progress'];
  targetProgressLoading?: boolean;
  targetProgressError?: Error | null;
  onManageTargets?: () => void;
  onTargetProgressRetry?: () => void;
  stats?: OverviewStatsData | null;
  trackedProducts?: TrackedProductWithInventory[];
  onTrackedProductsChange?: (products: TrackedProduct[]) => void;
  maxTrackedProducts?: number;
  cashFlow?: CashFlowDataPoint[] | null;
  projects?: ProjectSummary[] | null;
  orders?: OrderSummary[] | null;
  loadingStates?: {
    stats?: boolean;
    cashFlow?: boolean;
    projects?: boolean;
    orders?: boolean;
  };
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverviewDashboard({
  kpiWidgets = [],
  kpiLoading,
  kpiError,
  onKpiRetry,
  targetProgress,
  targetProgressLoading,
  targetProgressError,
  onManageTargets,
  onTargetProgressRetry,
  stats,
  trackedProducts,
  onTrackedProductsChange,
  maxTrackedProducts,
  cashFlow,
  projects,
  orders,
  loadingStates = {},
  className,
}: OverviewDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI Widgets (date range filtered) */}
      {kpiWidgets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiWidgets.map((kpi) => (
            <KPIWidget
              key={kpi.key}
              value={kpi.value}
              label={kpi.label}
              icon={kpi.icon}
              trend={
                kpi.trend !== undefined
                  ? { value: kpi.trend, period: 'vs last period' }
                  : undefined
              }
              isLoading={kpiLoading}
              error={kpiError ?? null}
              onViewDetails={onKpiRetry}
              formatValue={(val) => String(val)}
            />
          ))}
        </div>
      )}

      <TargetProgressWidget
        progress={targetProgress ?? null}
        isLoading={targetProgressLoading}
        error={targetProgressError ?? null}
        onRetry={onTargetProgressRetry}
        onManageTargets={onManageTargets}
      />

      {/* Stats Cards Row */}
      <OverviewStats
        data={stats}
        isLoading={loadingStates.stats}
        trackedProducts={trackedProducts}
        onTrackedProductsChange={onTrackedProductsChange}
        maxTrackedProducts={maxTrackedProducts}
      />

      {/* Cash Flow Chart */}
      <CashFlowChart data={cashFlow} isLoading={loadingStates.cashFlow} />

      {/* Two Tables Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectsTable projects={projects} isLoading={loadingStates.projects} maxItems={5} />
        <OrdersTable orders={orders} isLoading={loadingStates.orders} maxItems={5} />
      </div>
    </div>
  );
}

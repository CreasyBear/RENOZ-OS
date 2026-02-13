/**
 * Overview Dashboard Container
 *
 * ARCHITECTURE: Container Component - handles data fetching and passes to presenter.
 *
 * Fetches all data for the Overview dashboard and passes it to the
 * OverviewDashboard presenter component.
 *
 * @source statsData from usePipelineMetrics + useOrders + useInventoryDashboard
 * @source trackedProducts from useTrackedProducts hook (user-configurable)
 * @source cashFlowData from useRevenueByPeriod hook (adapted for money in/out)
 * @source projectsData from useActiveProjects hook
 * @source ordersData from useOrders hook
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DollarSign, TrendingUp, ShoppingCart, Users } from 'lucide-react';

// Data hooks
import { useRevenueByPeriod } from '@/hooks/financial/use-financial';
import { usePipelineMetrics } from '@/hooks/pipeline/use-pipeline-metrics';
import { useOrders } from '@/hooks/orders/use-orders';
import { useActiveProjects } from '@/hooks/jobs/use-active-projects';
import { useInventoryDashboard } from '@/hooks/inventory/use-inventory';
import { useDashboardMetrics, useTargetProgress, useTrackedProducts } from '@/hooks/dashboard';
import { useOrgFormat } from '@/hooks/use-org-format';
import { useDashboardDateRange } from '@/components/domain/dashboard/dashboard-context';
import { serializeDateForUrl } from '@/hooks/filters/use-filter-url-state';

// Presenter
import { OverviewDashboard } from './overview-dashboard';
import type { OverviewStatsData } from './overview-stats';
import type { CashFlowDataPoint } from './cash-flow-chart';
import type { ProjectSummary } from './projects-table';
import type { OrderSummary } from './orders-table';
import { projectStatusSchema } from '@/lib/schemas/jobs/projects';
import { orderStatusSchema } from '@/lib/schemas/orders';

// ============================================================================
// TYPES
// ============================================================================

export interface OverviewContainerProps {
  className?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function OverviewContainer({ className }: OverviewContainerProps) {
  const navigate = useNavigate();
  const { dateRange } = useDashboardDateRange();
  const { formatCurrency, formatNumber } = useOrgFormat();

  // -------------------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------------------

  // Pipeline metrics for stats
  const pipelineQuery = usePipelineMetrics();

  // Orders for "Orders Pending" stat + recent orders table
  const pendingOrdersQuery = useOrders({ status: 'confirmed', pageSize: 10 });
  const recentOrdersQuery = useOrders({ pageSize: 10 });

  // Inventory for "Low Stock Items"
  const inventoryQuery = useInventoryDashboard();

  // User-tracked products (localStorage-backed, user-configurable)
  const {
    productsWithInventory: trackedProducts,
    setProducts: setTrackedProducts,
    isLoading: trackedProductsLoading,
    maxProducts,
  } = useTrackedProducts();

  // Active projects for projects table
  const projectsQuery = useActiveProjects(10);

  // Revenue by period for cash flow chart (last 12 months)
  const { twelveMonthsAgo, today } = useMemo(() => {
    const now = new Date();
    const past = new Date();
    past.setMonth(past.getMonth() - 12);
    return { twelveMonthsAgo: past, today: now };
  }, []);

  const revenueQuery = useRevenueByPeriod({
    dateFrom: twelveMonthsAgo,
    dateTo: today,
    periodType: 'monthly',
  });

  // Dashboard KPI metrics filtered by date range selector
  // Uses serializeDateForUrl per FILTER-STANDARDS.md for consistent YYYY-MM-DD format
  const dashboardMetricsQuery = useDashboardMetrics({
    dateFrom: serializeDateForUrl(dateRange.from),
    dateTo: serializeDateForUrl(dateRange.to),
  });

  const targetProgressQuery = useTargetProgress();


  // -------------------------------------------------------------------------
  // DATA TRANSFORMATION
  // -------------------------------------------------------------------------

  // Transform stats data
  // Note: Using pipeline weightedValue as "won" proxy since we don't have wonThisMonth
  const statsData: OverviewStatsData | null = useMemo(() => {
    const pipelineValue = pipelineQuery.data?.weightedValue ?? 0;
    const opportunityCount = pipelineQuery.data?.opportunityCount ?? 0;

    return {
      wonThisMonth: {
        count: opportunityCount,
        value: pipelineValue,
        changePercent: undefined,
      },
      ordersPending: {
        count: pendingOrdersQuery.data?.total ?? 0,
        oldestDays: undefined,
      },
      lowStockItems: {
        count: inventoryQuery.data?.metrics?.lowStockCount ?? 0,
        criticalCount: inventoryQuery.data?.metrics?.outOfStockCount ?? 0,
      },
    };
  }, [pipelineQuery.data, pendingOrdersQuery.data, inventoryQuery.data]);

  const kpiWidgets = useMemo(() => {
    const summary = dashboardMetricsQuery.data?.summary;
    return [
      {
        key: 'revenue',
        label: 'Revenue',
        value: formatCurrency(summary?.revenue?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.revenue?.change,
        icon: DollarSign,
      },
      {
        key: 'pipeline',
        label: 'Pipeline',
        value: formatCurrency(summary?.pipelineValue?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.pipelineValue?.change,
        icon: TrendingUp,
      },
      {
        key: 'orders',
        label: 'Orders',
        value: formatNumber(summary?.ordersCount?.current ?? 0, { decimals: 0 }),
        trend: summary?.ordersCount?.change,
        icon: ShoppingCart,
      },
      {
        key: 'customers',
        label: 'Customers',
        value: formatNumber(summary?.customerCount?.current ?? 0, { decimals: 0 }),
        trend: summary?.customerCount?.change,
        icon: Users,
      },
    ];
  }, [dashboardMetricsQuery.data, formatCurrency, formatNumber]);


  // Transform cash flow data from revenue periods
  // Note: This is a simplified approximation - real cash flow would need expense data
  const cashFlowData: CashFlowDataPoint[] | null = useMemo(() => {
    if (!revenueQuery.data?.periods) return null;

    return revenueQuery.data.periods.map((period) => ({
      period: period.periodLabel ?? period.period,
      moneyIn: period.totalRevenue ?? 0,
      // Approximate money out as 70% of revenue (simplified for demo)
      // In production, this would come from expense tracking
      moneyOut: Math.round((period.totalRevenue ?? 0) * 0.7),
    }));
  }, [revenueQuery.data]);

  // Transform projects data
  const projectsData: ProjectSummary[] | null = useMemo(() => {
    if (!projectsQuery.data) return null;

    return projectsQuery.data.map((project) => {
      const parsed = projectStatusSchema.safeParse(project.status);
      return {
        id: project.id,
        name: project.title, // ActiveProject uses title not name
        customerName: project.customerName ?? 'Unknown Customer',
        status: parsed.success ? parsed.data : 'in_progress',
        progress: project.progress ?? 0,
        updatedAt: new Date().toISOString(), // Not available in ActiveProject
      };
    });
  }, [projectsQuery.data]);

  // Transform orders data
  const ordersData: OrderSummary[] | null = useMemo(() => {
    // The orders hook returns { orders: OrderListItem[], total: number }
    const orders = recentOrdersQuery.data?.orders;
    if (!orders) return null;

    return orders.map((order) => {
      const parsed = orderStatusSchema.safeParse(order.status);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? 'Unknown Customer',
        status: parsed.success ? parsed.data : 'confirmed',
        total: order.total ?? 0,
        createdAt: order.createdAt,
      };
    });
  }, [recentOrdersQuery.data]);

  // -------------------------------------------------------------------------
  // LOADING STATES
  // -------------------------------------------------------------------------

  const loadingStates = {
    stats: pipelineQuery.isLoading || pendingOrdersQuery.isLoading || inventoryQuery.isLoading || trackedProductsLoading,
    cashFlow: revenueQuery.isLoading,
    projects: projectsQuery.isLoading,
    orders: recentOrdersQuery.isLoading,
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <OverviewDashboard
      kpiWidgets={kpiWidgets}
      kpiLoading={dashboardMetricsQuery.isLoading}
      kpiError={dashboardMetricsQuery.error instanceof Error ? dashboardMetricsQuery.error : null}
      onKpiRetry={() => dashboardMetricsQuery.refetch()}
      targetProgress={targetProgressQuery.data ?? null}
      targetProgressLoading={targetProgressQuery.isLoading}
      targetProgressError={
        targetProgressQuery.error instanceof Error ? targetProgressQuery.error : null
      }
      onTargetProgressRetry={() => targetProgressQuery.refetch()}
      onManageTargets={() => navigate({ to: '/settings/targets' })}
      stats={statsData}
      trackedProducts={trackedProducts}
      onTrackedProductsChange={setTrackedProducts}
      maxTrackedProducts={maxProducts}
      cashFlow={cashFlowData}
      projects={projectsData}
      orders={ordersData}
      loadingStates={loadingStates}
      className={className}
    />
  );
}

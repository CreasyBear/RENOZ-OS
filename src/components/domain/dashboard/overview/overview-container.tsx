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

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from '@tanstack/react-router';
import { endOfMonth, startOfMonth } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, Users } from 'lucide-react';

// Data hooks
import { useRevenueByPeriod } from '@/hooks/financial/use-financial';
import { useOrders, useOrderStats } from '@/hooks/orders/use-orders';
import { useActiveProjects } from '@/hooks/jobs/use-active-projects';
import { useInventoryDashboard } from '@/hooks/inventory/use-inventory';
import { useDashboardMetrics, useTargetProgress, useTrackedProducts } from '@/hooks/dashboard';
import { useOrgFormat } from '@/hooks/use-org-format';
import { useDashboardDateRange } from '@/components/domain/dashboard/dashboard-context';
import { serializeDateForUrl } from '@/hooks/filters/use-filter-url-state';
import { getRevenueAttribution } from '@/server/functions/pipeline/pipeline';
import { getSummaryState } from '@/lib/metrics/summary-health';

// Presenter
import { OverviewDashboard } from './overview-dashboard';
import type { CashFlowDataPoint } from './cash-flow-chart';
import type { ProjectSummary } from './projects-table';
import type { OrderSummary } from './orders-table';
import { projectStatusSchema } from '@/lib/schemas/jobs/projects';
import { orderStatusSchema } from '@/lib/schemas/orders';
import {
  buildOverviewStats,
  getOverviewSummaryWarning,
  type OverviewStatsData,
} from './overview-metrics';

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

  // Orders for "Orders Pending" stat + recent orders table
  const orderStatsQuery = useOrderStats();
  const recentOrdersQuery = useOrders({ pageSize: 10 });

  // Inventory for "Low Stock Items"
  const inventoryQuery = useInventoryDashboard();

  // User-tracked products (localStorage-backed, user-configurable)
  const {
    productsWithInventory: trackedProducts,
    setProducts: setTrackedProducts,
    isLoading: trackedProductsLoading,
    maxProducts,
    trackedProductsWarning,
    trackedProductsUnavailable,
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
  const getRevenueAttributionFn = useServerFn(getRevenueAttribution);

  const { currentMonthStartParam, currentMonthEndParam } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    return {
      currentMonthStartParam:
        serializeDateForUrl(currentMonthStart) ?? currentMonthStart.toISOString().slice(0, 10),
      currentMonthEndParam:
        serializeDateForUrl(currentMonthEnd) ?? currentMonthEnd.toISOString().slice(0, 10),
    };
  }, []);

  const wonThisMonthQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'wonThisMonth',
      currentMonthStartParam,
      currentMonthEndParam,
    ],
    queryFn: async () => {
      const result = await getRevenueAttributionFn({
        data: {
          dateFrom: currentMonthStartParam,
          dateTo: currentMonthEndParam,
          groupBy: 'month',
        },
      });
      if (result == null) throw new Error('Won this month metrics are unavailable.');
      return result;
    },
    staleTime: 60 * 1000,
  });


  // -------------------------------------------------------------------------
  // DATA TRANSFORMATION
  // -------------------------------------------------------------------------

  // Transform stats data
  const statsData: OverviewStatsData = useMemo(() => {
    const wonTotals = wonThisMonthQuery.data?.totals;
    const wonSummaryState = getSummaryState({
      data: wonThisMonthQuery.data,
      error: wonThisMonthQuery.error,
      isLoading: wonThisMonthQuery.isLoading,
    });
    const ordersSummaryState = getSummaryState({
      data: orderStatsQuery.data,
      error: orderStatsQuery.error,
      isLoading: orderStatsQuery.isLoading,
    });
    const inventorySummaryState = getSummaryState({
      data: inventoryQuery.data,
      error: inventoryQuery.error,
      isLoading: inventoryQuery.isLoading,
    });

    return buildOverviewStats({
      wonThisMonth: {
        wonCount: wonTotals?.wonCount ?? 0,
        wonValue: wonTotals?.wonValue ?? 0,
        changePercent: undefined,
        summaryState: wonSummaryState,
      },
      ordersPending: {
        count: orderStatsQuery.data?.pendingOrders ?? 0,
        oldestDays: undefined,
        summaryState: ordersSummaryState,
      },
      lowStockItems: {
        count: inventoryQuery.data?.metrics?.lowStockCount ?? 0,
        criticalCount: inventoryQuery.data?.metrics?.outOfStockCount ?? 0,
        summaryState: inventorySummaryState,
      },
    });
  }, [
    inventoryQuery.data,
    inventoryQuery.error,
    inventoryQuery.isLoading,
    orderStatsQuery.data,
    orderStatsQuery.error,
    orderStatsQuery.isLoading,
    wonThisMonthQuery.data,
    wonThisMonthQuery.error,
    wonThisMonthQuery.isLoading,
  ]);

  const statsSummaryWarning = useMemo(
    () => getOverviewSummaryWarning(statsData),
    [statsData]
  );

  const kpiWidgets = useMemo(() => {
    const summary = dashboardMetricsQuery.data?.summary;
    return [
      {
        key: 'revenueInvoiced',
        label: 'Revenue (Invoiced)',
        value: formatCurrency(summary?.revenue?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.revenue?.change,
        icon: DollarSign,
      },
      {
        key: 'revenueCash',
        label: 'Revenue (Cash)',
        value: formatCurrency(summary?.revenueCash?.current ?? 0, { cents: false, showCents: true }),
        trend: summary?.revenueCash?.change,
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
  // Use cashRevenue for "money in" (payments received) - aligns with cash basis
  // Note: moneyOut is simplified - real cash flow would need expense data
  const cashFlowData: CashFlowDataPoint[] | null = useMemo(() => {
    if (!revenueQuery.data?.periods) return null;

    return revenueQuery.data.periods.map((period) => ({
      period: period.periodLabel ?? period.period,
      moneyIn: period.cashRevenue ?? 0,
      // Approximate money out as 70% of cash in (simplified for demo)
      moneyOut: Math.round((period.cashRevenue ?? 0) * 0.7),
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
    stats: trackedProductsLoading,
    cashFlow: revenueQuery.isLoading,
    projects: projectsQuery.isLoading,
    orders: recentOrdersQuery.isLoading,
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug('[overview-container] query-state-json', JSON.stringify({
      dashboardMetrics: {
        status: dashboardMetricsQuery.status,
        hasData: !!dashboardMetricsQuery.data,
        error: dashboardMetricsQuery.error instanceof Error ? dashboardMetricsQuery.error.message : dashboardMetricsQuery.error,
      },
      targetProgress: {
        status: targetProgressQuery.status,
        hasData: !!targetProgressQuery.data,
        error: targetProgressQuery.error instanceof Error ? targetProgressQuery.error.message : targetProgressQuery.error,
        targetCount: targetProgressQuery.data?.targets?.length,
      },
      orderStats: {
        status: orderStatsQuery.status,
        hasData: !!orderStatsQuery.data,
        error: orderStatsQuery.error instanceof Error ? orderStatsQuery.error.message : orderStatsQuery.error,
      },
      recentOrders: {
        status: recentOrdersQuery.status,
        hasData: !!recentOrdersQuery.data,
        error: recentOrdersQuery.error instanceof Error ? recentOrdersQuery.error.message : recentOrdersQuery.error,
        count: recentOrdersQuery.data?.orders?.length,
      },
      inventory: {
        status: inventoryQuery.status,
        hasData: !!inventoryQuery.data,
        error: inventoryQuery.error instanceof Error ? inventoryQuery.error.message : inventoryQuery.error,
      },
      projects: {
        status: projectsQuery.status,
        hasData: !!projectsQuery.data,
        error: projectsQuery.error instanceof Error ? projectsQuery.error.message : projectsQuery.error,
      },
      revenue: {
        status: revenueQuery.status,
        hasData: !!revenueQuery.data,
        error: revenueQuery.error instanceof Error ? revenueQuery.error.message : revenueQuery.error,
      },
    }));
  }, [
    dashboardMetricsQuery.data,
    dashboardMetricsQuery.error,
    dashboardMetricsQuery.status,
    inventoryQuery.data,
    inventoryQuery.error,
    inventoryQuery.status,
    orderStatsQuery.data,
    orderStatsQuery.error,
    orderStatsQuery.status,
    projectsQuery.data,
    projectsQuery.error,
    projectsQuery.status,
    recentOrdersQuery.data,
    recentOrdersQuery.error,
    recentOrdersQuery.status,
    revenueQuery.data,
    revenueQuery.error,
    revenueQuery.status,
    targetProgressQuery.data,
    targetProgressQuery.error,
    targetProgressQuery.status,
  ]);

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
      statsSummaryWarning={statsSummaryWarning}
      trackedProducts={trackedProducts}
      trackedProductsWarning={trackedProductsWarning ?? trackedProductsUnavailable}
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

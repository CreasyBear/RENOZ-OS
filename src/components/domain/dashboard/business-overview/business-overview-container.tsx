/**
 * Business Overview Dashboard Container
 *
 * ARCHITECTURE: Container Component - handles data fetching and passes to presenter.
 *
 * Fetches all data for the Business Overview dashboard and passes it to the
 * BusinessOverviewDashboard presenter component.
 *
 * @source financialMetrics from useFinancialDashboardMetrics hook
 * @source revenueTrend from useRevenueByPeriod hook
 * @source arAging from useARAgingReport hook
 * @source pipelineMetrics from usePipelineMetrics hook
 * @source pipelineForecast from usePipelineForecast hook
 * @source expiringQuotes from useExpiringQuotes hook
 * @source customerKpis from useCustomerKpis hook
 * @source healthDistribution from useHealthDistribution hook
 * @source orders from useOrders hook
 * @source activeProjects from useActiveProjects hook
 * @source inventoryHealth from useInventoryDashboard hook
 */

import { useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Financial hooks
import {
  useFinancialDashboardMetrics,
  useRevenueByPeriod,
  useARAgingReport,
} from '@/hooks/financial/use-financial';

// Pipeline hooks
import { usePipelineMetrics, usePipelineForecast } from '@/hooks/pipeline/use-pipeline-metrics';
import { useExpiringQuotes } from '@/hooks/pipeline/use-quotes';

// Customer hooks
import { useCustomerKpis, useHealthDistribution } from '@/hooks/customers/use-customer-analytics';

// Operations hooks
import { useOrders } from '@/hooks/orders/use-orders';
import { useActiveProjects } from '@/hooks/jobs/use-active-projects';
import { useInventoryDashboard } from '@/hooks/inventory/use-inventory';

// Recent items hooks for popovers
import {
  useRecentOutstandingInvoices,
  useRecentOverdueInvoices,
  useRecentOpportunities,
  useRecentOrdersToShip,
} from '@/hooks/dashboard';

// Presenter
import { BusinessOverviewDashboard } from './business-overview-dashboard';
import type {
  FinancialMetrics,
  RevenueTrendPoint,
  PipelineMetrics,
  StageData,
  ForecastPoint,
  CustomerKpis,
  HealthDistribution,
  OperationsMetrics,
} from './sections';

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessOverviewContainerProps {
  className?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function BusinessOverviewContainer({ className }: BusinessOverviewContainerProps) {
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // FINANCIAL DATA
  // -------------------------------------------------------------------------
  const financialQuery = useFinancialDashboardMetrics({ includePreviousPeriod: true });

  // Revenue trend for the past 6 months - memoize dates for query key stability
  const { sixMonthsAgo, today } = useMemo(() => {
    const now = new Date();
    const past = new Date();
    past.setMonth(past.getMonth() - 6);
    return { sixMonthsAgo: past, today: now };
  }, []);

  const revenueQuery = useRevenueByPeriod({
    dateFrom: sixMonthsAgo,
    dateTo: today,
    periodType: 'monthly',
  });

  const arAgingQuery = useARAgingReport();

  // Recent items for popovers
  const recentOutstandingQuery = useRecentOutstandingInvoices({ limit: 5 });
  const recentOverdueQuery = useRecentOverdueInvoices({ limit: 5 });

  // Transform financial data - API returns KPIMetric objects with .value property
  const financialMetrics: FinancialMetrics | null = useMemo(() => {
    if (!financialQuery.data) return null;

    const data = financialQuery.data;
    // Calculate overdue from AR aging if available
    const overdueAr = arAgingQuery.data?.totals?.totalOverdue ?? 0;

    // Transform recent items for popover display
    const recentOutstandingInvoices = recentOutstandingQuery.data?.items.map((item) => ({
      id: item.id,
      orderNumber: item.subtitle?.split(' · ')[0] ?? '',
      customerName: item.title,
      balanceDue: parseFloat(item.subtitle?.split('$')[1]?.replace(/,/g, '') ?? '0'),
      daysOverdue: item.status === 'warning' ? 1 : 0,
    }));

    const recentOverdueInvoices = recentOverdueQuery.data?.items.map((item) => ({
      id: item.id,
      orderNumber: item.subtitle?.split(' · ')[0] ?? '',
      customerName: item.title,
      balanceDue: 0,
      daysOverdue: parseInt(item.subtitle?.match(/(\d+) days/)?.[1] ?? '0', 10),
    }));

    return {
      revenueMtd: data.revenueInvoicedMTD?.value ?? 0,
      revenueMtdChange: data.revenueInvoicedMTD?.changePercent,
      arBalance: data.arBalance?.value ?? 0,
      cashReceived: data.cashReceivedMTD?.value ?? 0,
      overdueAr,
      // Contextual data for insights
      invoiceCount: data.invoiceCount,
      overdueCount: data.overdueCount,
      avgDaysToPayment: data.averageDaysToPayment,
      // Recent items for popovers
      recentOutstandingInvoices,
      recentOverdueInvoices,
    };
  }, [financialQuery.data, arAgingQuery.data, recentOutstandingQuery.data, recentOverdueQuery.data]);

  // Transform revenue periods - RevenuePeriodData has totalRevenue not revenue
  const revenueTrend: RevenueTrendPoint[] | null = useMemo(() => {
    if (!revenueQuery.data?.periods) return null;

    return revenueQuery.data.periods.map((p) => ({
      period: p.periodLabel ?? p.period,
      revenue: p.totalRevenue ?? 0,
    }));
  }, [revenueQuery.data]);

  // -------------------------------------------------------------------------
  // PIPELINE DATA
  // -------------------------------------------------------------------------
  const pipelineQuery = usePipelineMetrics();
  const forecastQuery = usePipelineForecast({ months: 6, groupBy: 'month' });
  const expiringQuotesQuery = useExpiringQuotes({ warningDays: 7 });
  const recentOpportunitiesQuery = useRecentOpportunities({ limit: 5 });

  // Transform pipeline data
  const pipelineMetrics: PipelineMetrics | null = useMemo(() => {
    if (!pipelineQuery.data) return null;

    const oppCount = pipelineQuery.data.opportunityCount ?? 0;
    const totalVal = pipelineQuery.data.totalValue ?? 0;

    return {
      totalValue: totalVal,
      weightedValue: pipelineQuery.data.weightedValue ?? 0,
      conversionRate: pipelineQuery.data.conversionRate ?? 0,
      expiringQuotesCount: expiringQuotesQuery.data?.expiringQuotes?.length ?? 0,
      // Contextual data for insights
      opportunityCount: oppCount,
      avgDealSize: oppCount > 0 ? Math.round(totalVal / oppCount) : undefined,
      // Recent items for popovers
      recentOpportunities: recentOpportunitiesQuery.data?.items,
    };
  }, [pipelineQuery.data, expiringQuotesQuery.data, recentOpportunitiesQuery.data]);

  const stageData: StageData[] | null = useMemo(() => {
    if (!pipelineQuery.data?.byStage) return null;

    return Object.entries(pipelineQuery.data.byStage).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }));
  }, [pipelineQuery.data]);

  // Transform forecast - uses .forecast array, not .periods
  const forecast: ForecastPoint[] | null = useMemo(() => {
    if (!forecastQuery.data?.forecast) return null;

    return forecastQuery.data.forecast.map((p) => ({
      period: p.period ?? '',
      value: p.totalValue ?? 0,
      weightedValue: p.weightedValue,
    }));
  }, [forecastQuery.data]);

  // -------------------------------------------------------------------------
  // CUSTOMER DATA
  // -------------------------------------------------------------------------
  const customerKpisQuery = useCustomerKpis('30d');
  const healthDistQuery = useHealthDistribution();

  // Transform customer data - kpis are in array format with label/value pairs
  const customerKpis: CustomerKpis | null = useMemo(() => {
    if (!customerKpisQuery.data?.kpis) return null;

    const kpis = customerKpisQuery.data.kpis;

    // Find relevant KPIs by label and parse formatted values
    const totalCustomersKpi = kpis.find((k) => k.label === 'Total Customers');
    const totalCustomers = parseFormattedNumber(totalCustomersKpi?.value);

    // Active Rate is shown as percentage - use as retention proxy
    const activeRateKpi = kpis.find((k) => k.label === 'Active Rate');
    const retentionRate = parsePercentage(activeRateKpi?.value);

    // Churn is inverse of retention
    const churnRate = 100 - retentionRate;

    return {
      totalCustomers,
      retentionRate,
      churnRate,
    };
  }, [customerKpisQuery.data]);

  // Transform health distribution - API uses counts not poor
  const healthDistribution: HealthDistribution | null = useMemo(() => {
    if (!healthDistQuery.data?.counts) return null;

    const counts = healthDistQuery.data.counts;
    return {
      excellent: counts.excellent ?? 0,
      good: counts.good ?? 0,
      fair: counts.fair ?? 0,
      poor: 0, // API doesn't have 'poor', uses 'atRisk' instead
      atRisk: counts.atRisk ?? 0,
    };
  }, [healthDistQuery.data]);

  // -------------------------------------------------------------------------
  // OPERATIONS DATA
  // -------------------------------------------------------------------------
  const ordersQuery = useOrders({ status: 'confirmed', pageSize: 1 });
  const projectsQuery = useActiveProjects(100);
  const inventoryQuery = useInventoryDashboard();
  const recentOrdersToShipQuery = useRecentOrdersToShip({ limit: 5 });

  // Transform operations data - inventory dashboard has nested metrics
  const operationsMetrics: OperationsMetrics | null = useMemo(() => {
    return {
      ordersToShip: ordersQuery.data?.total ?? 0,
      activeProjects: projectsQuery.data?.length ?? 0,
      lowStockItems: inventoryQuery.data?.metrics?.lowStockCount ?? 0,
      totalInventoryValue: inventoryQuery.data?.metrics?.totalValue,
      // Recent items for popovers
      recentOrdersToShip: recentOrdersToShipQuery.data?.items,
    };
  }, [ordersQuery.data, projectsQuery.data, inventoryQuery.data, recentOrdersToShipQuery.data]);

  // -------------------------------------------------------------------------
  // LOADING & ERROR STATES
  // -------------------------------------------------------------------------
  const isLoading =
    financialQuery.isLoading ||
    pipelineQuery.isLoading ||
    customerKpisQuery.isLoading ||
    ordersQuery.isLoading;

  const isRefreshing =
    financialQuery.isRefetching ||
    pipelineQuery.isRefetching ||
    customerKpisQuery.isRefetching ||
    ordersQuery.isRefetching;

  const loadingStates = {
    financial: financialQuery.isLoading || revenueQuery.isLoading || arAgingQuery.isLoading,
    pipeline: pipelineQuery.isLoading || forecastQuery.isLoading || expiringQuotesQuery.isLoading,
    customer: customerKpisQuery.isLoading || healthDistQuery.isLoading,
    operations: ordersQuery.isLoading || projectsQuery.isLoading || inventoryQuery.isLoading,
  };

  // Log errors in development to help diagnose loading issues
  if (import.meta.env.DEV) {
    const errors = [
      financialQuery.error && `Financial: ${financialQuery.error.message}`,
      revenueQuery.error && `Revenue: ${revenueQuery.error.message}`,
      arAgingQuery.error && `AR Aging: ${arAgingQuery.error.message}`,
      pipelineQuery.error && `Pipeline: ${pipelineQuery.error.message}`,
      forecastQuery.error && `Forecast: ${forecastQuery.error.message}`,
      customerKpisQuery.error && `Customer KPIs: ${customerKpisQuery.error.message}`,
      ordersQuery.error && `Orders: ${ordersQuery.error.message}`,
    ].filter(Boolean);

    if (errors.length > 0) {
      logger.error('[BusinessOverview] Query errors', undefined, { errors });
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleRefresh = useCallback(() => {
    // Invalidate all business overview related queries
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.customerAnalytics.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.activeProjects() });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
  }, [queryClient]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <BusinessOverviewDashboard
      financialMetrics={financialMetrics}
      revenueTrend={revenueTrend}
      pipelineMetrics={pipelineMetrics}
      stageData={stageData}
      forecast={forecast}
      customerKpis={customerKpis}
      healthDistribution={healthDistribution}
      operationsMetrics={operationsMetrics}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      loadingStates={loadingStates}
      onRefresh={handleRefresh}
      className={className}
    />
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse a formatted number string like "1,234" to a number
 */
function parseFormattedNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Remove commas and currency symbols
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a percentage string like "85%" to a number
 */
function parsePercentage(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Remove % sign
  const cleaned = value.replace(/%/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

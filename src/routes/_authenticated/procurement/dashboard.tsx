/**
 * Procurement Dashboard Route
 *
 * Executive procurement overview and real-time monitoring dashboard.
 * Following the container/presenter pattern with real data fetching.
 *
 * @source procurementDashboard from useProcurementDashboard hook
 * @source spendMetrics from useSpendMetrics hook
 * @source orderMetrics from useOrderMetrics hook
 * @source supplierMetrics from useSupplierMetrics hook
 * @source pendingApprovals from usePendingApprovals hook
 * @source alerts from useProcurementAlerts hook
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-PROCUREMENT-DASHBOARD)
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { FinancialDashboardSkeleton } from '@/components/skeletons/financial';
import { ErrorState } from '@/components/shared/error-state';
import { ProcurementDashboard } from '@/components/domain/procurement/procurement-dashboard';
import {
  useProcurementDashboard,
  useSpendMetrics,
  useOrderMetrics,
  useSupplierMetrics,
  useProcurementAlerts,
  usePendingApprovals,
} from '@/hooks/suppliers';
import { useActivityFeed } from '@/hooks/activities';
import { procurementDashboardSearchSchema } from '@/lib/schemas/procurement/procurement-dashboard-search';
import type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
  ProcurementAlert,
} from '@/lib/schemas/procurement';

// ============================================================================
// CONSTANTS
// ============================================================================

import {
  DEFAULT_CURRENCY,
  RATING_SCALE_FACTOR,
  HIGH_PRIORITY_APPROVAL_THRESHOLD,
  FALLBACK_SUPPLIER_NAME,
  DEFAULT_BUDGET_TOTAL,
} from '@/lib/constants/procurement';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/procurement/dashboard')({
  validateSearch: procurementDashboardSearchSchema,
  component: ProcurementDashboardPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/procurement" />
  ),
  pendingComponent: () => <FinancialDashboardSkeleton />,
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

/**
 * Procurement Dashboard Page Container
 * Fetches all required data and transforms it for the presenter component.
 */
function ProcurementDashboardPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  // Date range state
  const dateRange = search.range;
  const customDateRange = useMemo(() => {
    const parseDate = (value?: string) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const from = parseDate(search.from);
    const to = parseDate(search.to);

    if (!from && !to) return null;
    return { from, to };
  }, [search.from, search.to]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  // Calculate date range boundaries - useMemo for stable references
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    switch (dateRange) {
      case 'week':
        d.setDate(d.getDate() - 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() - 1);
        break;
      case 'quarter':
        d.setMonth(d.getMonth() - 3);
        break;
      case 'year':
        d.setFullYear(d.getFullYear() - 1);
        break;
    }
    return { dateFrom: d, dateTo: now };
  }, [dateRange]);

  const effectiveDateFrom = customDateRange?.from ?? dateFrom;
  const effectiveDateTo = customDateRange?.to ?? dateTo;

  // Fetch procurement dashboard data
  const {
    isLoading: isDashboardLoading,
  } = useProcurementDashboard({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    includePreviousPeriod: true,
  });

  // Fetch individual metrics for dashboard widgets
  const { 
    data: spendData, 
    isLoading: isSpendLoading,
    error: spendError,
    refetch: refetchSpend,
  } = useSpendMetrics({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
  });

  const { 
    data: orderData, 
    isLoading: isOrderLoading,
    error: orderError,
    refetch: refetchOrders,
  } = useOrderMetrics({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
  });

  const { 
    data: supplierData, 
    isLoading: isSupplierLoading,
    error: supplierError,
    refetch: refetchSuppliers,
  } = useSupplierMetrics({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
  });

  // Fetch pending approvals
  const { 
    data: approvalsData, 
    isLoading: isApprovalsLoading,
    error: approvalsError,
    refetch: refetchApprovals,
  } = usePendingApprovals({
    pageSize: 5,
  });

  // Fetch alerts
  const { 
    data: alertsData, 
    isLoading: isAlertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useProcurementAlerts();

  const activityFeed = useActivityFeed({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    pageSize: 10,
  });

  // Collect errors for display - show all errors, not just first
  const errors = [
    spendError,
    orderError,
    supplierError,
    approvalsError,
    alertsError,
  ].filter((e): e is Error => e instanceof Error);

  // Transform data to match presenter types
  const spendMetrics: SpendMetrics | undefined = useMemo(() => {
    if (!spendData) return undefined;
    
    // Calculate trend from trends array (compare first and last period)
    const trends = spendData.trends;
    const trendPercent = trends.length >= 2
      ? ((trends[trends.length - 1].spend - trends[0].spend) / (trends[0].spend || 1)) * 100
      : 0;
    
    // Calculate actual monthly spend from current month's trend data
    // Find the most recent month in trends array
    const currentMonthSpend = trends.length > 0 
      ? trends[trends.length - 1].spend 
      : 0;
    
    // Budget tracking not implemented - using default values
    // When budget tracking is added (PROCUREMENT-BUDGET-TRACKING feature),
    // these should come from budget data via useBudget hook
    const budgetTotal = DEFAULT_BUDGET_TOTAL;
    const budgetUsed = spendData.totalSpend;
    
    return {
      totalSpend: spendData.totalSpend,
      monthlySpend: currentMonthSpend,
      budgetTotal,
      budgetUsed,
      trendPercent: Math.abs(Math.round(trendPercent * 10) / 10),
      trendDirection: trendPercent >= 0 ? 'up' : 'down',
    };
  }, [spendData]);

  const orderMetrics: OrderMetrics | undefined = useMemo(() => {
    if (!orderData) return undefined;
    return {
      totalOrders: orderData.totalOrders,
      pendingApproval: orderData.byStatus.pendingApproval,
      awaitingDelivery: orderData.byStatus.awaitingDelivery,
      completedThisMonth: orderData.byStatus.completed,
    };
  }, [orderData]);

  const supplierMetrics: SupplierMetrics | undefined = useMemo(() => {
    if (!supplierData) return undefined;
    return {
      totalSuppliers: supplierData.totalSuppliers,
      activeSuppliers: supplierData.activeSuppliers,
      avgRating: supplierData.avgRating,
      topPerformers: supplierData.topPerformers.map((s) => ({
        id: s.supplierId ?? '',
        name: s.supplierName,
        rating: s.overallScore / RATING_SCALE_FACTOR, // Convert 0-100 to 0-5 scale
      })),
    };
  }, [supplierData]);

  const pendingApprovals: ApprovalItem[] = useMemo(() => {
    return (approvalsData?.items ?? []).map((a) => ({
      id: a.id,
      poNumber: a.poNumber ?? `PO-${a.purchaseOrderId.slice(0, 8)}`,
      supplierName: a.supplierName ?? FALLBACK_SUPPLIER_NAME,
      amount: a.totalAmount ?? 0,
      currency: a.currency ?? DEFAULT_CURRENCY,
      submittedAt:
        a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt ?? new Date().toISOString(),
      priority: (a.totalAmount ?? 0) > HIGH_PRIORITY_APPROVAL_THRESHOLD ? 'high' : 'normal',
    }));
  }, [approvalsData]);

  const alerts: ProcurementAlert[] | undefined = useMemo(() => {
    if (!alertsData?.alerts) return undefined;
    return alertsData.alerts
      .filter((a) => !dismissedAlertIds.has(a.id))
      .map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt,
        linkTo: a.linkTo,
        linkParams: a.linkParams,
        linkLabel: a.linkLabel,
      }));
  }, [alertsData, dismissedAlertIds]);

  // Combined loading state
  const isLoading = isDashboardLoading || isSpendLoading || isOrderLoading || 
                   isSupplierLoading || isApprovalsLoading || isAlertsLoading;
  
  // Error handling - show all errors if any exist
  const hasErrors = errors.length > 0;
  const primaryError = errors[0] ?? null;

  // Handlers - individual widget retry functions
  const handleRefreshSpend = useCallback(() => {
    refetchSpend();
  }, [refetchSpend]);

  const handleRefreshOrders = useCallback(() => {
    refetchOrders();
  }, [refetchOrders]);

  const handleRefreshSuppliers = useCallback(() => {
    refetchSuppliers();
  }, [refetchSuppliers]);

  const handleRefreshApprovals = useCallback(() => {
    refetchApprovals();
  }, [refetchApprovals]);

  // Combined refresh (refetch all)
  const handleRefresh = useCallback(() => {
    refetchSpend();
    refetchOrders();
    refetchSuppliers();
    refetchApprovals();
    refetchAlerts();
  }, [refetchSpend, refetchOrders, refetchSuppliers, refetchApprovals, refetchAlerts]);

  const handleDateRangeChange = useCallback(
    (range: 'week' | 'month' | 'quarter' | 'year') => {
      navigate({
        search: (prev) => ({
          ...prev,
          range,
          from: undefined,
          to: undefined,
        }),
        replace: true,
      });
    },
    [navigate]
  );

  const handleCustomDateRangeChange = useCallback(
    (from: Date | null, to: Date | null) => {
      navigate({
        search: (prev) => ({
          ...prev,
          range: prev.range ?? dateRange,
          from: from ? from.toISOString() : undefined,
          to: to ? to.toISOString() : undefined,
        }),
        replace: true,
      });
    },
    [dateRange, navigate]
  );

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(id));
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Procurement Dashboard"
        description="Executive overview of procurement operations and real-time monitoring"
      />

      <PageLayout.Content>
        {hasErrors && primaryError && (
          <div className="mb-4">
            <ErrorState
              title="Failed to load procurement data"
              message={
                errors.length > 1
                  ? `${errors.length} widgets failed to load. ${primaryError.message || 'Try refreshing.'}`
                  : primaryError.message || 'One or more procurement widgets failed to load. Try refreshing.'
              }
              onRetry={handleRefresh}
            />
          </div>
        )}
        <ProcurementDashboard
          spendMetrics={spendMetrics}
          orderMetrics={orderMetrics}
          supplierMetrics={supplierMetrics}
          pendingApprovals={pendingApprovals}
          alerts={alerts}
          isLoading={isLoading}
          errors={{
            spend: spendError instanceof Error ? spendError : null,
            orders: orderError instanceof Error ? orderError : null,
            suppliers: supplierError instanceof Error ? supplierError : null,
            approvals: approvalsError instanceof Error ? approvalsError : null,
            alerts: alertsError instanceof Error ? alertsError : null,
          }}
          onRefresh={handleRefresh}
          onRefreshSpend={handleRefreshSpend}
          onRefreshOrders={handleRefreshOrders}
          onRefreshSuppliers={handleRefreshSuppliers}
          onRefreshApprovals={handleRefreshApprovals}
          onDismissAlert={handleDismissAlert}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          customDateFrom={customDateRange?.from ?? null}
          customDateTo={customDateRange?.to ?? null}
          onCustomDateRangeChange={handleCustomDateRangeChange}
          activityFeed={activityFeed}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

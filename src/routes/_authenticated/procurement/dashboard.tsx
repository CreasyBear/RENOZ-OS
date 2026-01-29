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
import { ProcurementDashboard } from '@/components/domain/procurement/procurement-dashboard';
import {
  useProcurementDashboard,
  useSpendMetrics,
  useOrderMetrics,
  useSupplierMetrics,
  useProcurementAlerts,
  usePendingApprovals,
} from '@/hooks/suppliers';
import type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
  ProcurementAlert,
} from '@/components/domain/procurement';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/procurement/dashboard')({
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
  // Date range state
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

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

  // Fetch procurement dashboard data
  const {
    isLoading: isDashboardLoading,
    refetch,
  } = useProcurementDashboard({
    dateFrom,
    dateTo,
    includePreviousPeriod: true,
  });

  // Fetch individual metrics for dashboard widgets
  const { 
    data: spendData, 
    isLoading: isSpendLoading,
    error: spendError,
  } = useSpendMetrics({
    dateFrom,
    dateTo,
  });

  const { 
    data: orderData, 
    isLoading: isOrderLoading,
    error: orderError,
  } = useOrderMetrics({
    dateFrom,
    dateTo,
  });

  const { 
    data: supplierData, 
    isLoading: isSupplierLoading,
    error: supplierError,
  } = useSupplierMetrics({
    dateFrom,
    dateTo,
  });

  // Fetch pending approvals
  const { 
    data: approvalsData, 
    isLoading: isApprovalsLoading,
    error: approvalsError,
  } = usePendingApprovals({
    pageSize: 5,
  });

  // Fetch alerts
  const { 
    data: alertsData, 
    isLoading: isAlertsLoading,
    error: alertsError,
  } = useProcurementAlerts();

  // Log errors for debugging
  if (spendError) console.error('Spend metrics error:', spendError);
  if (orderError) console.error('Order metrics error:', orderError);
  if (supplierError) console.error('Supplier metrics error:', supplierError);
  if (approvalsError) console.error('Approvals error:', approvalsError);
  if (alertsError) console.error('Alerts error:', alertsError);

  // Transform data to match presenter types
  const spendMetrics: SpendMetrics | undefined = useMemo(() => {
    if (!spendData) return undefined;
    // Calculate trend from trends array (compare first and last period)
    const trends = spendData.trends;
    const trendPercent = trends.length >= 2
      ? ((trends[trends.length - 1].spend - trends[0].spend) / (trends[0].spend || 1)) * 100
      : 0;
    return {
      totalSpend: spendData.totalSpend,
      monthlySpend: spendData.totalSpend, // Simplified - could calculate actual monthly
      budgetTotal: 0, // Budget total not available in current schema
      budgetUsed: spendData.totalSpend,
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
        rating: s.overallScore / 20, // Convert 0-100 to 0-5 scale
      })),
    };
  }, [supplierData]);

  const pendingApprovals: ApprovalItem[] = useMemo(() => {
    return (approvalsData?.items ?? []).map((a: any) => ({
      id: a.id,
      poNumber: a.poNumber ?? `PO-${a.purchaseOrderId.slice(0, 8)}`,
      supplierName: a.supplierName ?? 'Unknown Supplier',
      amount: a.totalAmount ?? 0,
      currency: 'AUD',
      submittedAt: a.orderDate ?? new Date().toISOString(),
      priority: a.totalAmount > 10000 ? 'high' : 'normal',
    }));
  }, [approvalsData]);

  const alerts: ProcurementAlert[] | undefined = useMemo(() => {
    if (!alertsData?.alerts) return undefined;
    return alertsData.alerts.map((a: any) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      createdAt: a.createdAt,
      linkTo: a.linkTo,
      linkParams: a.linkParams,
      linkLabel: a.linkLabel,
      dismissible: a.dismissible,
    }));
  }, [alertsData]);

  // Combined loading state
  const isLoading = isDashboardLoading || isSpendLoading || isOrderLoading || 
                   isSupplierLoading || isApprovalsLoading || isAlertsLoading;

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDateRangeChange = useCallback((range: 'week' | 'month' | 'quarter' | 'year') => {
    setDateRange(range);
  }, []);

  const handleDismissAlert = useCallback((id: string) => {
    // TODO: Implement alert dismissal mutation
    console.log('Dismiss alert:', id);
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Procurement Dashboard"
        description="Executive overview of procurement operations and real-time monitoring"
      />

      <PageLayout.Content>
        <ProcurementDashboard
          spendMetrics={spendMetrics}
          orderMetrics={orderMetrics}
          supplierMetrics={supplierMetrics}
          pendingApprovals={pendingApprovals}
          alerts={alerts}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onDismissAlert={handleDismissAlert}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

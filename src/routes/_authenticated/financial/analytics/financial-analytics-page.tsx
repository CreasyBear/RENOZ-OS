/**
 * Financial Analytics Page Component
 *
 * Analytics dashboard with KPIs, revenue charts, and top customers.
 * Moved from landing page to dedicated analytics route.
 *
 * @source metrics from useFinancialDashboardMetrics hook
 * @source revenue from useRevenueByPeriod hook
 * @source topCustomers from useTopCustomersByRevenue hook
 * @source outstanding from useOutstandingInvoices hook
 *
 * @see src/routes/_authenticated/financial/analytics/index.tsx - Route definition
 * @see src/components/domain/financial/financial-dashboard.tsx (presenter)
 */

import { useState } from 'react';
import { subMonths, startOfYear } from 'date-fns';
import { PageLayout } from '@/components/layout';
import { FinancialDashboard } from '@/components/domain/financial/financial-dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useFinancialDashboardMetrics,
  useRevenueByPeriod,
  useTopCustomersByRevenue,
  useOutstandingInvoices,
} from '@/hooks/financial';
import type { PeriodType } from '@/lib/schemas';

export default function FinancialAnalyticsPage() {
  // ===========================================================================
  // UI STATE
  // ===========================================================================

  // Period type state for revenue chart
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [topCustomersBasis, setTopCustomersBasis] = useState<'invoiced' | 'cash'>('invoiced');

  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  // Dashboard metrics query
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useFinancialDashboardMetrics({ includePreviousPeriod: true });

  // Revenue by period query
  const {
    data: revenueByPeriod,
    isLoading: revenueLoading,
    error: revenueError,
  } = useRevenueByPeriod({
    dateFrom: subMonths(new Date(), 6),
    dateTo: new Date(),
    periodType,
  });

  // Top customers query
  const {
    data: topCustomers,
    isLoading: customersLoading,
    error: customersError,
  } = useTopCustomersByRevenue({
    dateFrom: startOfYear(new Date()),
    dateTo: new Date(),
    pageSize: 5,
    basis: topCustomersBasis,
  });

  // Outstanding invoices query
  const {
    data: outstanding,
    isLoading: outstandingLoading,
    error: outstandingError,
  } = useOutstandingInvoices({ overdueOnly: true, pageSize: 5 });

  // Combined loading and error states
  const isLoading =
    metricsLoading || revenueLoading || customersLoading || outstandingLoading;
  const error = metricsError || revenueError || customersError || outstandingError;
  const hasUsableDashboardData = Boolean(
    metrics || revenueByPeriod || topCustomers || outstanding
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial Analytics"
        description="Revenue trends, KPIs, and financial insights"
      />
      <PageLayout.Content>
        {error && hasUsableDashboardData ? (
          <Alert className="mb-4">
            <AlertTitle>Showing your latest financial snapshot</AlertTitle>
            <AlertDescription>
              Some financial panels could not be refreshed just now. Existing data is still available below.
            </AlertDescription>
          </Alert>
        ) : null}
        <FinancialDashboard
          dashboardData={{
            metrics,
            revenueByPeriod,
            topCustomers,
            outstanding,
          }}
          isLoading={isLoading}
          error={!hasUsableDashboardData ? error ?? undefined : undefined}
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          topCustomersBasis={topCustomersBasis}
          onTopCustomersBasisChange={setTopCustomersBasis}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

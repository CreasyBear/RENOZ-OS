/**
 * AR Aging Report Page
 *
 * Accounts receivable aging report showing outstanding balances
 * grouped by aging buckets (current, 30, 60, 90+ days).
 *
 * @see src/components/domain/financial/ar-aging-report.tsx
 * @see src/server/functions/ar-aging.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-001)
 */

import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FinancialTableSkeleton } from '@/components/skeletons/financial';
import { ARAgingReport } from '@/components/domain/financial/ar-aging-report';
import { useARAgingReport } from '@/hooks/financial';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/ar-aging')({
  component: ARAgingReportPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="AR Aging Report"
        description="Accounts receivable aging analysis by customer"
      />
      <PageLayout.Content>
        <FinancialTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function ARAgingReportPage() {
  const navigate = Route.useNavigate();
  const [commercialOnly, setCommercialOnly] = useState(false);

  // Fetch AR aging data
  const { data, isLoading, error } = useARAgingReport({ commercialOnly });

  // Navigate to customer details
  const handleCustomerClick = useCallback(
    (customerId: string) => {
      navigate({
        to: '/customers/$customerId',
        params: { customerId },
        search: {},
      });
    },
    [navigate]
  );

  const handleExport = useCallback(() => {
    if (!data) return;

    const bucketTotals = data.bucketSummary.reduce(
      (acc, bucket) => {
        acc[bucket.bucket] = bucket.amount;
        return acc;
      },
      {
        current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      } as Record<string, number>
    );

    const rows = [
      [
        'Customer',
        'Current',
        '1-30',
        '31-60',
        '61-90',
        '90+',
        'Total Outstanding',
      ],
      ...data.customers.map((customer) => [
        customer.customerName,
        customer.current,
        customer.overdue1_30,
        customer.overdue31_60,
        customer.overdue61_90,
        customer.overdue90Plus,
        customer.totalOutstanding,
      ]),
      [
        'Totals',
        bucketTotals.current,
        bucketTotals['1-30'],
        bucketTotals['31-60'],
        bucketTotals['61-90'],
        bucketTotals['90+'],
        data.totals.totalOutstanding,
      ],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            typeof value === 'string'
              ? `"${value.replaceAll('"', '""')}"`
              : value ?? ''
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ar-aging-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="AR Aging Report"
        description="Accounts receivable aging analysis by customer"
      />
      <PageLayout.Content>
        <ARAgingReport
          report={data}
          isLoading={isLoading}
          error={error}
          commercialOnly={commercialOnly}
          onCommercialOnlyChange={setCommercialOnly}
          onCustomerClick={handleCustomerClick}
          onExport={handleExport}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

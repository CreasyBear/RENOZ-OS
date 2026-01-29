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
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

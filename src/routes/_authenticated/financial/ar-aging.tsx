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
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { PageLayout } from '@/components/layout/page-layout';
import { ARAgingReport } from '@/components/domain/financial/ar-aging-report';
import { getARAgingReport } from '@/server/functions/financial/ar-aging';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/ar-aging')({
  component: ARAgingReportPage,
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function ARAgingReportPage() {
  const navigate = Route.useNavigate();
  const getFn = useServerFn(getARAgingReport);
  const [commercialOnly, setCommercialOnly] = useState(false);

  // Fetch AR aging data
  const { data, isLoading, error } = useQuery({
    queryKey: ['ar-aging', commercialOnly],
    queryFn: () => getFn({ data: { commercialOnly } }),
  });

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
    <PageLayout>
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

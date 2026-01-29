/**
 * Procurement Reports Route
 *
 * Advanced procurement analytics and automated reporting dashboard.
 * Following established reporting patterns with comprehensive analytics.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-ANALYTICS-REPORTING)
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { ProcurementReportsPage } from '@/components/domain/reports/procurement-reports-page';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/reports/procurement/')({
  component: ProcurementReportsRoute,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Procurement Reports"
        description="Advanced procurement analytics and automated reporting"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ProcurementReportsRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Procurement Reports"
        description="Advanced procurement analytics and automated reporting"
      />
      <PageLayout.Content>
        <ProcurementReportsPage />
      </PageLayout.Content>
    </PageLayout>
  );
}

/**
 * Financial Summary Report Route
 *
 * @see reports_domain_remediation Phase 6
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { FinancialSummaryPage } from '@/components/domain/reports/financial-summary-page';
import { financialSummarySearchSchema } from '@/lib/schemas/reports/financial-summary';

export const Route = createFileRoute('/_authenticated/reports/financial')({
  validateSearch: financialSummarySearchSchema,
  component: FinancialSummaryRoute,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial Summary"
        description="Revenue, AR, and cash flow overview"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function FinancialSummaryRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial Summary"
        description="Revenue, AR, and cash flow overview"
      />
      <PageLayout.Content>
        <FinancialSummaryPage />
      </PageLayout.Content>
    </PageLayout>
  );
}

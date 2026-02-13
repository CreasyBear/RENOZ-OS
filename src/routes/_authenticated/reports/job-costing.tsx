/**
 * Job Costing Report Page
 *
 * Profitability analysis for battery installation jobs.
 * Shows material + labor costs vs quoted prices with margin analysis.
 *
 * @see src/server/functions/job-costing.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-008b
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { JobCostingReportPage } from '@/components/domain/reports/job-costing-report-page';
import { jobCostingReportSearchSchema } from '@/lib/schemas/reports/job-costing';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/reports/job-costing')({
  validateSearch: jobCostingReportSearchSchema,
  component: JobCostingRoute,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Job Costing Report"
        description="Analyze job profitability and cost breakdown"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function JobCostingRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Job Costing Report"
        description="Analyze job profitability and cost breakdown"
      />
      <PageLayout.Content>
        <JobCostingReportPage />
      </PageLayout.Content>
    </PageLayout>
  );
}

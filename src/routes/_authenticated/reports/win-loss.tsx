/**
 * Win/Loss Analysis Route
 *
 * Route for analyzing win/loss patterns and trends in pipeline opportunities.
 * Uses container component that handles data fetching and passes to presenter.
 *
 * @see src/components/domain/reports/win-loss-analysis-container.tsx (container)
 * @see src/components/domain/reports/win-loss-analysis.tsx (presenter)
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { WinLossAnalysisContainer } from '@/components/domain/reports/win-loss-analysis-container';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/reports/win-loss')({
  component: WinLossAnalysisPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Win/Loss Analysis"
        description="Analyze win/loss patterns in pipeline opportunities"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// COMPONENT
// ============================================================================

function WinLossAnalysisPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <WinLossAnalysisContainer />
      </PageLayout.Content>
    </PageLayout>
  );
}

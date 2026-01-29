/**
 * Win/Loss Analysis Route
 *
 * Route for analyzing win/loss patterns and trends in pipeline opportunities.
 * Uses WinLossAnalysis component which handles its own data fetching.
 *
 * Note: This component currently uses the container pattern where the component
 * does its own data fetching. The hooks in @/hooks/reports are available for
 * use when refactoring to a presenter pattern in the future.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { createFileRoute } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { WinLossAnalysis } from '@/components/domain/reports/win-loss-analysis';

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
        <WinLossAnalysis />
      </PageLayout.Content>
    </PageLayout>
  );
}

/**
 * Pipeline Forecast Report Page
 *
 * Sales forecasting dashboard with multiple views, charts, and analytics.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-FORECASTING-UI)
 */

import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { ReportDashboardSkeleton } from "@/components/skeletons/reports";
import { PipelineForecastPage } from "@/components/domain/reports/pipeline-forecast-page";
import { pipelineForecastSearchSchema } from "@/lib/schemas/reports/pipeline-forecast";

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute("/_authenticated/reports/pipeline-forecast")({
  validateSearch: pipelineForecastSearchSchema,
  component: PipelineForecastRoute,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Pipeline Forecast"
        description="Sales forecasting and analytics dashboard"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function PipelineForecastRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Pipeline Forecast"
        description="Sales forecasting and analytics dashboard"
      />
      <PageLayout.Content>
        <PipelineForecastPage />
      </PageLayout.Content>
    </PageLayout>
  );
}

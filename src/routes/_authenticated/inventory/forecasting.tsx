/**
 * Forecasting Route
 *
 * Route definition for demand forecasting dashboard with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/forecasting-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const ForecastingPage = lazy(() => import("./forecasting-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/forecasting")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Demand Forecasting" />
        <PageLayout.Content>
          <InventoryTabsSkeleton tabCount={2} showMetrics />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ForecastingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Demand Forecasting" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} showMetrics />
      </PageLayout.Content>
    </PageLayout>
  ),
});

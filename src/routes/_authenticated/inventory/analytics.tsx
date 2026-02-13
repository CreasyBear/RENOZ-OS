/**
 * Inventory Analytics Route
 *
 * Route definition for comprehensive warehouse analytics and reporting dashboard.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/analytics-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const AnalyticsPage = lazy(() => import("./analytics-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/analytics")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Inventory Analytics" />
        <PageLayout.Content>
          <InventoryTabsSkeleton tabCount={4} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <AnalyticsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Analytics" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

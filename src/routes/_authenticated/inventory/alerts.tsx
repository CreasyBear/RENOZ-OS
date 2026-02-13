/**
 * Inventory Alerts Route
 *
 * Route definition for inventory alert management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/alerts-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTabsSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const AlertsPage = lazy(() => import("./alerts-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/alerts")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Inventory Alerts" />
        <PageLayout.Content>
          <InventoryTabsSkeleton tabCount={3} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <AlertsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Alerts" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

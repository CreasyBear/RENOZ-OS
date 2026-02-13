/**
 * Inventory Locations Route
 *
 * Route definition for warehouse location management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/locations-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { TreeDetailSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const LocationsPage = lazy(() => import("./locations-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/locations")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Warehouse Locations" />
        <PageLayout.Content>
          <TreeDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <LocationsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Warehouse Locations" />
      <PageLayout.Content>
        <TreeDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

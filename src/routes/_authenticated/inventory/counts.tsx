/**
 * Stock Counts Route
 *
 * Route definition for cycle counting management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/counts-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const StockCountsPage = lazy(() => import("./counts-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/counts")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Stock Counts" description="Manage cycle counts and physical inventory" />
        <PageLayout.Content>
          <InventoryTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <StockCountsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Stock Counts" description="Manage cycle counts and physical inventory" />
      <PageLayout.Content>
        <InventoryTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

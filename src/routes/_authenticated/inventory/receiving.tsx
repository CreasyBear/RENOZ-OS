/**
 * Receiving Route
 *
 * Route definition for goods receiving interface with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/receiving-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const ReceivingPage = lazy(() => import("./receiving-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/receiving")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Receive Inventory" description="Record incoming goods and update stock levels" />
        <PageLayout.Content>
          <FormSkeleton sections={2} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ReceivingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Receive Inventory" description="Record incoming goods and update stock levels" />
      <PageLayout.Content>
        <FormSkeleton sections={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

/**
 * Campaign Analytics Route
 *
 * Route definition for campaign analytics and reporting dashboard.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/campaigns/analytics-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const AnalyticsPage = lazy(() => import("./analytics-page"));

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/campaigns/analytics")({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <AnalyticsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications/campaigns" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});

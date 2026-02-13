/**
 * Mobile Home Route
 *
 * Route definition for warehouse mobile interface with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/mobile/mobile-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDashboardSkeleton } from "@/components/skeletons/inventory";

const MobileHomePage = lazy(() => import('./mobile-page'));

export const Route = createFileRoute("/_authenticated/mobile/")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <InventoryDashboardSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <MobileHomePage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <InventoryDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

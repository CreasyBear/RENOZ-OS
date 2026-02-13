/**
 * Inventory Item Detail Route
 *
 * Uses Container/Presenter pattern with InventoryDetailContainer.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDetailSkeleton } from "@/components/skeletons/inventory";

const InventoryItemPage = lazy(() => import("./-inventory-item-page"));

export const Route = createFileRoute("/_authenticated/inventory/$itemId")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title={null} />
        <PageLayout.Content>
          <InventoryDetailSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <InventoryItemPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <InventoryDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

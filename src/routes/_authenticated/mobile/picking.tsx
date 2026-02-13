/**
 * Mobile Picking Route
 *
 * Mobile-optimized order picking for warehouse handheld devices.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

const MobilePickingPage = lazy(() => import("./-picking-page"));

export const Route = createFileRoute("/_authenticated/mobile/picking")({
  component: () => (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <MobilePickingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/mobile" />
  ),
  pendingComponent: () => <InventoryTableSkeleton />,
});

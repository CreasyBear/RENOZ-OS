/**
 * Mobile Counting Route
 *
 * Mobile-optimized cycle counting for warehouse handheld devices.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

const MobileCountingPage = lazy(() => import("./-counting-page"));

export const Route = createFileRoute("/_authenticated/mobile/counting")({
  component: () => (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <MobileCountingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/mobile" />
  ),
  pendingComponent: () => <InventoryTableSkeleton />,
});

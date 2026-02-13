/**
 * Mobile Receiving Route
 *
 * Mobile-optimized goods receiving for warehouse handheld devices.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

const MobileReceivingPage = lazy(() => import("./-receiving-page"));

export const Route = createFileRoute("/_authenticated/mobile/receiving")({
  component: () => (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <MobileReceivingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/mobile" />
  ),
  pendingComponent: () => <InventoryTableSkeleton />,
});

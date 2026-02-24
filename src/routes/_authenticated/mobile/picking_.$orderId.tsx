/**
 * Mobile Picking Route (with order)
 *
 * Mobile-optimized order picking for a specific order.
 * Route: /mobile/picking_/$orderId
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

const MobilePickingPage = lazy(() => import("./-picking-page"));

export const Route = createFileRoute("/_authenticated/mobile/picking_/$orderId")({
  component: PickingOrderComponent,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/mobile" />
  ),
  pendingComponent: () => <InventoryTableSkeleton />,
});

function PickingOrderComponent() {
  const { orderId } = Route.useParams();
  return (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <MobilePickingPage orderId={orderId} />
    </Suspense>
  );
}

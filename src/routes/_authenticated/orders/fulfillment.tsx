/**
 * Order Fulfillment Route
 *
 * Operations dashboard for order fulfillment workflow.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";
import { FulfillmentDashboardContainer } from "@/components/domain/orders/fulfillment/fulfillment-dashboard-container";
import { ConfirmDeliveryDialog } from "@/components/domain/orders/fulfillment/confirm-delivery-dialog";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/fulfillment")({
  component: FulfillmentPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/orders" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Order Fulfillment"
        description="Track and manage order fulfillment"
      />
      <PageLayout.Content>
        <OrdersTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function FulfillmentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const highlightOrderIds = useMemo(() => {
    const state = location.state as { highlightOrderIds?: string[] } | undefined;
    return state?.highlightOrderIds ?? undefined;
  }, [location.state]);

  // Dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmShipmentId, setConfirmShipmentId] = useState<string | null>(null);

  // Handlers
  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate({
        to: "/orders/$orderId",
        params: { orderId },
      });
    },
    [navigate]
  );

  const handleShipOrder = useCallback((orderId: string) => {
    navigate({
      to: "/orders/$orderId",
      params: { orderId },
      search: { ship: true },
    });
  }, [navigate]);

  const handleConfirmDelivery = useCallback((shipmentId: string) => {
    setConfirmShipmentId(shipmentId);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmDialogClose = useCallback(() => {
    setConfirmDialogOpen(false);
    setConfirmShipmentId(null);
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Order Fulfillment"
        description="Manage order picking, shipping, and delivery tracking"
      />
      <PageLayout.Content>
        <FulfillmentDashboardContainer
          onViewOrder={handleViewOrder}
          onShipOrder={handleShipOrder}
          onConfirmDelivery={handleConfirmDelivery}
          highlightOrderIds={highlightOrderIds}
        />
      </PageLayout.Content>

      {/* Confirm Delivery Dialog */}
      {confirmShipmentId && (
        <ConfirmDeliveryDialog
          open={confirmDialogOpen}
          onOpenChange={handleConfirmDialogClose}
          shipmentId={confirmShipmentId}
          onSuccess={handleConfirmDialogClose}
        />
      )}
    </PageLayout>
  );
}

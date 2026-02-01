/**
 * Order Fulfillment Route
 *
 * Operations dashboard for order fulfillment workflow.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-FULFILLMENT-DASHBOARD)
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";
import { FulfillmentDashboardContainer } from "@/components/domain/orders";
import { ShipOrderDialog, ConfirmDeliveryDialog } from "@/components/domain/orders";

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

  // Dialog state
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
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
    setShipOrderId(orderId);
    setShipDialogOpen(true);
  }, []);

  const handleConfirmDelivery = useCallback((shipmentId: string) => {
    setConfirmShipmentId(shipmentId);
    setConfirmDialogOpen(true);
  }, []);

  const handleShipDialogClose = useCallback(() => {
    setShipDialogOpen(false);
    setShipOrderId(null);
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
        />
      </PageLayout.Content>

      {/* Ship Order Dialog */}
      {shipOrderId && (
        <ShipOrderDialog
          open={shipDialogOpen}
          onOpenChange={handleShipDialogClose}
          orderId={shipOrderId}
          onSuccess={handleShipDialogClose}
        />
      )}

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

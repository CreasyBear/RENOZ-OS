/**
 * Order Detail Route
 *
 * Individual order view with tabs for overview, items, fulfillment, and activity.
 * Uses Container/Presenter pattern via OrderDetailContainer.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-DETAIL-UI)
 * @see STANDARDS.md - Container/Presenter pattern
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { OrderDetailSkeleton } from "@/components/skeletons/orders";
import { Button } from "@/components/ui/button";
import { OrderDetailContainer } from "@/components/domain/orders";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: OrderDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/orders" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Order Details" />
      <PageLayout.Content>
        <OrderDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = Route.useParams();

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigate({ to: "/orders" });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate({
      to: "/orders/$orderId",
      params: { orderId },
      search: { edit: true },
    });
  }, [navigate, orderId]);

  const handleDuplicate = useCallback(
    (newOrderId: string) => {
      navigate({
        to: "/orders/$orderId",
        params: { orderId: newOrderId },
      });
    },
    [navigate]
  );

  return (
    <OrderDetailContainer
      orderId={orderId}
      onBack={handleBack}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
    >
      {({ headerTitle, headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {headerTitle}
              </div>
            }
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </OrderDetailContainer>
  );
}

export default OrderDetailPage;

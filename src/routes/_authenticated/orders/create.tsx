/**
 * Order Creation Route
 *
 * Multi-step wizard for creating new orders.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { PageLayout } from "@/components/layout";
import { OrderCreationWizard } from "@/components/domain/orders";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/create")({
  component: OrderCreatePage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrderCreatePage() {
  const navigate = useNavigate();

  const handleComplete = useCallback(
    (orderId: string) => {
      navigate({
        to: "/orders/$orderId",
        params: { orderId },
      });
    },
    [navigate]
  );

  const handleCancel = useCallback(() => {
    navigate({ to: "/orders" });
  }, [navigate]);

  return (
    <PageLayout>
      <PageLayout.Header
        title="Create Order"
        description="Create a new customer order"
      />

      <PageLayout.Content>
        <div className="max-w-4xl mx-auto">
          <OrderCreationWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

export default OrderCreatePage;

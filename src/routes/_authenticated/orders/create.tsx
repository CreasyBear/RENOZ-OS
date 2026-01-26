/**
 * Order Creation Route
 *
 * Multi-step wizard for creating new orders.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";
import { OrderCreationWizard } from "@/components/domain/orders";
import type { OrderSubmitData } from "@/components/domain/orders/creation/order-creation-wizard";
import { useCreateOrder } from "@/hooks/orders/use-orders";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/orders/create")({
  component: OrderCreatePage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/orders" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Create Order"
        description="Create a new customer order"
      />
      <PageLayout.Content>
        <FormSkeleton sections={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrderCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateOrder();

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

  const handleSubmit = useCallback(
    async (data: OrderSubmitData): Promise<{ id: string; orderNumber: string }> => {
      // Format dates as YYYY-MM-DD strings and convert taxType enum
      const formatDate = (d: Date | null | undefined) =>
        d ? d.toISOString().split('T')[0] : undefined;

      const result = await createMutation.mutateAsync({
        customerId: data.customerId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        orderDate: formatDate(data.orderDate),
        dueDate: formatDate(data.dueDate),
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        shippingAmount: data.shippingAmount,
        internalNotes: data.internalNotes,
        customerNotes: data.customerNotes,
        lineItems: data.lineItems.map(item => ({
          ...item,
          // Map form taxType to server taxType enum
          taxType: item.taxType === 'gst' ? 'gst' :
                   item.taxType === 'export' ? 'export' :
                   item.taxType === 'exempt' ? 'gst_free' : 'gst' as const,
        })),
        metadata: {},
      });
      return { id: result.id, orderNumber: result.orderNumber };
    },
    [createMutation]
  );

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
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}

export default OrderCreatePage;

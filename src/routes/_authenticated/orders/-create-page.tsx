/**
 * Order Creation Page
 *
 * Extracted for code-splitting - see create.tsx for route definition.
 */
import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout";
import { OrderCreationWizard } from "@/components/domain/orders";
import type { OrderSubmitData } from "@/components/domain/orders/creation/order-creation-wizard";
import { useCreateOrder } from "@/hooks/orders/use-orders";

export default function OrderCreatePage() {
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
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Create Order"
        description="Create a new customer order"
      />
      <PageLayout.Content>
        <OrderCreationWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
